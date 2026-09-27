import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { getPaymentFeedback } from "@/lib/payment-feedback";

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
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { status: true, responseCode: true },
      },
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
    data: { bookings: bookings.map(({ payments, ...booking }) => ({
      ...booking,
      latestPayment: payments[0] ? {
        ...payments[0], feedback: getPaymentFeedback(payments[0].status, payments[0].responseCode),
      } : null,
    })) },
  });
}
