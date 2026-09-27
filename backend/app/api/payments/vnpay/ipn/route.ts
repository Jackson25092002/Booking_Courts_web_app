import prisma from "@/lib/prisma";
import { verifyVNPayQuery, isSuccessfulPayment } from "@/lib/vnpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = verifyVNPayQuery(new URL(request.url).searchParams, true);
    if (!result) return Response.json({ RspCode: "97", Message: "Invalid checksum" });
    const reply = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { txnRef: result.vnp_TxnRef }, include: { booking: true } });
      if (!payment) return { RspCode: "01", Message: "Order not found" };
      if (Number(result.vnp_Amount) !== payment.amount || payment.amount !== payment.booking.totalAmount) return { RspCode: "04", Message: "Invalid amount" };
      if (payment.status !== "WAITING") return { RspCode: "02", Message: "Order already confirmed" };
      const success = isSuccessfulPayment(result);
      if (!["PENDING", "CONFIRMED"].includes(payment.booking.status)) return { RspCode: "02", Message: "Order already confirmed" };
      await tx.payment.update({ where: { id: payment.id }, data: {
        status: success ? "SUCCEEDED" : "FAILED",
        responseCode: String(result.vnp_ResponseCode), transactionNo: String(result.vnp_TransactionNo || ""),
        bankCode: result.vnp_BankCode || null, paidAt: success ? new Date() : null,
      } });
      if (success) await tx.booking.update({ where: { id: payment.bookingId }, data: { status: "PAID" } });
      return { RspCode: "00", Message: "Confirm Success" };
    }, { isolationLevel: "Serializable" });
    return Response.json(reply);
  } catch {
    // VNPay can retry transient errors; never acknowledge a failed database write.
    return Response.json({ RspCode: "99", Message: "Unknown error" });
  }
}
