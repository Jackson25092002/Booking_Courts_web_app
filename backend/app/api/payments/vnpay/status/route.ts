import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { getPaymentFeedback } from "@/lib/payment-feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ success: false, message: "Vui lòng đăng nhập để xem thanh toán." }, 401);
  const txnRef = new URL(request.url).searchParams.get("txnRef") || "";
  if (!/^[a-f0-9]{32}$/.test(txnRef)) return jsonResponse({ success: false, message: "Mã thanh toán không hợp lệ." }, 400);
  const payment = await prisma.payment.findFirst({ where: { txnRef, booking: { userId: session.userId } }, select: { txnRef: true, status: true, amount: true, expiresAt: true, bookingId: true, responseCode: true, paidAt: true, booking: { select: { status: true } } } });
  if (!payment) return jsonResponse({ success: false, message: "Không tìm thấy thanh toán." }, 404);
  return jsonResponse({ success: true, data: { payment, feedback: getPaymentFeedback(payment.status, payment.responseCode), expired: payment.status === "WAITING" && payment.expiresAt <= new Date() } });
}
