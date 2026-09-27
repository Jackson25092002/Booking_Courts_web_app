import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;
export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập." }, 401);
  if (session.role !== "OWNER" && session.role !== "ADMIN") return jsonResponse({ message: "Chỉ chủ sân được xác nhận." }, 403);
  const input = z.object({ bookingId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonResponse({ message: "Mã đặt sân không hợp lệ." }, 400);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: input.data.bookingId, court: { ownerId: session.userId } }, include: { payments: { where: { status: "SUCCEEDED" } }, court: { select: { name: true } } } });
      if (!booking) return { code: 404, message: "Không tìm thấy đơn thuộc sân của bạn." };
      if (booking.status !== "PAID" || !booking.payments.some((p) => p.amount === booking.totalAmount)) return { code: 409, message: "Chỉ xác nhận đơn đã thanh toán đủ tiền." };
      if (!booking.confirmedAt) await tx.booking.update({ where: { id: booking.id }, data: { confirmedAt: new Date() } });
      await tx.notification.upsert({
        where: { userId_bookingId_kind: { userId: booking.userId, bookingId: booking.id, kind: "BOOKING_CONFIRMED" } }, update: {},
        create: { userId: booking.userId, bookingId: booking.id, kind: "BOOKING_CONFIRMED", message: `Chủ sân ${booking.court.name} đã xác nhận lịch đặt sân của bạn. Mã đơn ${booking.id.slice(0, 8)}.` },
      });
      return { code: 200, message: "Đã xác nhận và gửi thông báo cho khách hàng." };
    }, { isolationLevel: "Serializable" });
    return jsonResponse(result, result.code);
  } catch { return jsonResponse({ message: "Không thể xác nhận. Vui lòng thử lại." }, 409); }
}
