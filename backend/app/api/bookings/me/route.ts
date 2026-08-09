import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function GET(request: Request) {
  const session = await getAuthSession(request);

  if (!session) {
    return jsonResponse(
      { success: false, message: "Vui lòng đăng nhập để xem lịch sử đặt sân" },
      401,
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.userId },
    include: {
      court: {
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          district: true,
          imageUrl: true,
        },
      },
      slots: {
        orderBy: { startsAt: "asc" },
        include: {
          courtField: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonResponse({
    success: true,
    data: { bookings },
  });
}
