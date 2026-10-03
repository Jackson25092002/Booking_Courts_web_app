import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { reconcilePaymentThrottled } from "@/lib/reconcile-payment";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;
export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập." }, 401);
  const input = z.object({ txnRef: z.string().regex(/^[a-f0-9]{32}$/) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonResponse({ message: "Mã giao dịch không hợp lệ." }, 400);
  const payment = await prisma.payment.findFirst({ where: { txnRef: input.data.txnRef, booking: { userId: session.userId } } });
  if (!payment) return jsonResponse({ message: "Không tìm thấy giao dịch của bạn." }, 404);
  try { return jsonResponse({ data: await reconcilePaymentThrottled(input.data.txnRef) }); }
  catch { return jsonResponse({ message: "Không thể xác minh với VNPay. Không thanh toán lại khi chưa rõ kết quả." }, 502); }
}
