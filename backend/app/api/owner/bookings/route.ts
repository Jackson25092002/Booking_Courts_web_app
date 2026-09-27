import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;
export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập." }, 401);
  if (session.role !== "OWNER" && session.role !== "ADMIN") return jsonResponse({ message: "Chỉ chủ sân được truy cập." }, 403);
  const bookings = await prisma.booking.findMany({
    where: { court: { ownerId: session.userId }, status: "PAID", confirmedAt: null, payments: { some: { status: "SUCCEEDED" } } },
    include: { user: { select: { fullName: true, phone: true } }, court: { select: { name: true } }, slots: { include: { courtField: { select: { name: true } } }, orderBy: { startsAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse({ data: { bookings } });
}
