import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getVNPay, vnpayDate } from "@/lib/vnpay";

export const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;

// Claim a query in the database so separate tabs/serverless instances cannot
// repeatedly query VNPay for the same transaction. No new schema is required:
// WAITING payments otherwise keep their original updatedAt until settlement.
export async function reconcilePaymentThrottled(txnRef: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { txnRef } });
  if (payment.status !== "WAITING") return { settled: payment.status === "SUCCEEDED", message: "Giao dịch đã có kết quả." };
  const now = new Date();
  const neverQueried = Math.abs(payment.updatedAt.getTime() - payment.createdAt.getTime()) < 1000;
  const retryAt = new Date(payment.updatedAt.getTime() + RECONCILE_INTERVAL_MS);
  if (!neverQueried && retryAt > now) {
    return { settled: false, message: "Đang chờ VNPay xác nhận. Hệ thống sẽ tự kiểm tra lại.", nextReconcileAt: retryAt.toISOString() };
  }
  const claimedAt = new Date(Math.max(now.getTime(), payment.createdAt.getTime() + 1000));
  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: "WAITING", updatedAt: payment.updatedAt },
    data: { updatedAt: claimedAt },
  });
  const nextReconcileAt = new Date(claimedAt.getTime() + RECONCILE_INTERVAL_MS).toISOString();
  if (claim.count !== 1) return { settled: false, message: "Giao dịch đang được kiểm tra hoặc vừa cập nhật.", nextReconcileAt };
  return { ...await reconcilePayment(txnRef), nextReconcileAt };
}

// QueryDR reports API status separately from transaction status. Only settle verified success.
export async function reconcilePayment(txnRef: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { txnRef } });
  if (payment.status !== "WAITING") return { settled: payment.status === "SUCCEEDED", message: "Giao dịch đã có kết quả." };
  const { client } = getVNPay();
  const original = new URL(payment.paymentUrl).searchParams;
  const result = await client.queryDr({
    vnp_RequestId: randomUUID().replaceAll("-", ""), vnp_TxnRef: txnRef,
    vnp_OrderInfo: "Kiem tra thanh toan dat san", vnp_CreateDate: vnpayDate(new Date()),
    vnp_TransactionDate: Number(original.get("vnp_CreateDate")),
    vnp_IpAddr: "127.0.0.1", vnp_TransactionNo: 0,
  });
  // Rate-limit errors can be returned without a hash; they never settle a payment.
  if (String(result.vnp_ResponseCode) === "94") return { settled: false, message: "VNPay giới hạn truy vấn lặp (94). Vui lòng chờ ít nhất 5 phút rồi đối soát lại." };
  // SDK 2.5 does not reject a missing response hash; require it explicitly for settlement.
  if (!result.isVerified || !/^[a-fA-F0-9]{128}$/.test(result.vnp_SecureHash || "")) console.warn("VNPay QueryDR verification failed", { responseCode: result.vnp_ResponseCode, verified: result.isVerified, hashLength: result.vnp_SecureHash?.length || 0 });
  if (!/^[a-fA-F0-9]{128}$/.test(result.vnp_SecureHash || "") || !result.isVerified) return { settled: false, message: "Chưa xác minh được chữ ký phản hồi truy vấn VNPay. Không cập nhật thanh toán." };
  if (String(result.vnp_ResponseCode) !== "00") return { settled: false, message: `VNPay trả mã truy vấn ${result.vnp_ResponseCode}. Với mã 94, cần chờ ít nhất 5 phút giữa các truy vấn.` };
  if (result.vnp_TxnRef !== txnRef || Number(result.vnp_Amount) !== payment.amount * 100) throw new Error("VNPay reference or amount mismatch");
  if (String(result.vnp_TransactionStatus) !== "00" || result.vnp_TransactionType !== "01") return { settled: false, message: "VNPay chưa xác nhận giao dịch thành công. Không thanh toán lại nếu đã bị trừ tiền." };
  const settled = await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUniqueOrThrow({ where: { txnRef }, include: { booking: { include: { court: true } } } });
    if (current.status !== "WAITING") return current.status === "SUCCEEDED";
    if (!["PENDING", "CONFIRMED"].includes(current.booking.status) || current.amount !== current.booking.totalAmount) throw new Error("Booking state changed");
    await tx.payment.update({ where: { id: current.id }, data: { status: "SUCCEEDED", responseCode: "00", paidAt: new Date(), transactionNo: String(result.vnp_TransactionNo || ""), bankCode: result.vnp_BankCode || null } });
    await tx.booking.update({ where: { id: current.bookingId }, data: { status: "PAID" } });
    const ownerId = current.booking.court.ownerId;
    await tx.notification.upsert({ where: { userId_bookingId_kind: { userId: ownerId, bookingId: current.bookingId, kind: "BOOKING_PAID" } }, update: {}, create: { userId: ownerId, bookingId: current.bookingId, kind: "BOOKING_PAID", message: `Đã xác minh khách thanh toán đủ ${current.amount.toLocaleString("vi-VN")}đ tại ${current.booking.court.name}. Vui lòng xác nhận lịch đặt sân.` } });
    return true;
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 15000 });
  return { settled, message: settled ? "Đã xác minh thanh toán thành công với VNPay." : "Giao dịch vừa có kết quả khác. Vui lòng kiểm tra lại trạng thái." };
}
