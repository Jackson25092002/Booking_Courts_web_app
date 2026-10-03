import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập để xem hóa đơn đặt sân." }, 401);
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã đơn đặt sân không hợp lệ." }, 400);
  try {
    const booking = await prisma.booking.findFirst({
      where: { id, userId: session.userId },
      select: {
        id: true, status: true, totalAmount: true, note: true, createdAt: true, updatedAt: true, confirmedAt: true,
        user: { select: { fullName: true, email: true, phone: true } },
        court: { select: { id: true, name: true, address: true, district: true } },
        slots: { orderBy: { startsAt: "asc" }, select: {
          id: true, startsAt: true, endsAt: true, price: true,
          courtField: { select: { id: true, name: true } },
        } },
        payments: { orderBy: { createdAt: "desc" }, select: {
          txnRef: true, status: true, amount: true, responseCode: true,
          transactionNo: true, bankCode: true, paidAt: true,
        } },
      },
    });
    if (!booking) return jsonResponse({ message: "Không tìm thấy đơn đặt sân của bạn." }, 404);
    const { payments, ...details } = booking;
    // A successful payment is the receipt evidence, even if an older attempt failed.
    const payment = payments.find((item) => item.status === "SUCCEEDED") ?? payments[0] ?? null;
    return jsonResponse({ success: true, data: { booking: { ...details, payment } } });
  } catch {
    return jsonResponse({ message: "Không thể tải hóa đơn đặt sân. Vui lòng thử lại." }, 500);
  }
}
