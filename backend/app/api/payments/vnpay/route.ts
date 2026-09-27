import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { getVNPay, paymentClientIp, vnpayDate } from "@/lib/vnpay";

export const runtime = "nodejs";
export const OPTIONS = optionsResponse;

export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ success: false, message: "Vui lòng đăng nhập để thanh toán." }, 401);
  const input = z.object({ bookingId: z.uuid() }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonResponse({ success: false, message: "Mã đơn đặt sân không hợp lệ." }, 400);
  try {
    const { client, returnUrl } = getVNPay();
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: input.data.bookingId, userId: session.userId }, include: { slots: true } });
      if (!booking) return { status: 404, message: "Không tìm thấy đơn đặt sân." };
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { status: 409, message: "Đơn này không thể thanh toán hoặc đã thanh toán." };
      const needsReview = await tx.payment.findFirst({ where: { bookingId: booking.id, responseCode: "07" } });
      if (needsReview) return { status: 409, message: "Giao dịch có thể đã trừ tiền và cần đối soát. Vui lòng liên hệ hỗ trợ, không thanh toán lại." };
      const now = new Date();
      if (!booking.slots.length || booking.slots.some((slot) => slot.startsAt <= now) || booking.totalAmount <= 0 || booking.totalAmount > 9999999999)
        return { status: 400, message: "Đơn đặt sân đã qua giờ chơi hoặc số tiền không hợp lệ." };
      const waiting = await tx.payment.findFirst({ where: { bookingId: booking.id, status: "WAITING" }, orderBy: { createdAt: "desc" } });
      if (waiting && waiting.expiresAt > now) return { payment: waiting };
      // Expiration alone cannot prove the bank did not charge the customer.
      // Reconcile an expired unresolved attempt before issuing another payment link.
      if (waiting) return { status: 409, message: "Giao dịch cũ đang chờ xác nhận từ VNPay. Vui lòng kiểm tra kết quả hoặc liên hệ hỗ trợ trước khi thanh toán lại." };
      const expiresAt = new Date(Math.min(now.getTime() + 15 * 60000, ...booking.slots.map((slot) => slot.startsAt.getTime())));
      const txnRef = randomUUID().replaceAll("-", "");
      const paymentUrl = client.buildPaymentUrl({
        vnp_Amount: booking.totalAmount, // The SDK multiplies VND by 100; do not multiply again.
        vnp_TxnRef: txnRef, vnp_OrderInfo: `Thanh toan dat san ${booking.id.replaceAll("-", "")}`,
        vnp_IpAddr: paymentClientIp(request), vnp_ReturnUrl: returnUrl,
        vnp_CreateDate: vnpayDate(now), vnp_ExpireDate: vnpayDate(expiresAt),
      });
      return { payment: await tx.payment.create({ data: { bookingId: booking.id, amount: booking.totalAmount, txnRef, expiresAt, paymentUrl } }) };
    }, { isolationLevel: "Serializable" });
    if ("message" in result) return jsonResponse({ success: false, message: result.message }, result.status);
    return jsonResponse({ success: true, data: { paymentUrl: result.payment.paymentUrl, txnRef: result.payment.txnRef, expiresAt: result.payment.expiresAt } }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "VNPAY_NOT_CONFIGURED") return jsonResponse({ success: false, message: "VNPay chưa được cấu hình đầy đủ trên máy chủ." }, 503);
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return jsonResponse({ success: false, message: "Đơn đang được xử lý. Vui lòng thử lại." }, 409);
    console.error("VNPay create payment failed", error instanceof Error ? error.name : "UnknownError");
    return jsonResponse({ success: false, message: "Không thể tạo thanh toán. Đơn vẫn được lưu trong lịch sử để thử lại." }, 500);
  }
}
