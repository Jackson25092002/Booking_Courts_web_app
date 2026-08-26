import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

function vietnamDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDateRange(dateString: string) {
  const start = new Date(`${dateString}T00:00:00+07:00`);
  const end = new Date(`${dateString}T23:59:59.999+07:00`);
  return { start, end };
}

export async function GET(request: Request) {
  const session = await getAuthSession(request);

  if (!session) {
    return jsonResponse({ success: false, message: "Bạn cần đăng nhập" }, 401);
  }

  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return jsonResponse({ success: false, message: "Chỉ tài khoản chủ sân được truy cập" }, 403);
  }

  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date") ?? vietnamDateString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return jsonResponse({ success: false, message: "Ngày xem không hợp lệ" }, 400);
  }

  const { start: dayStart, end: dayEnd } = getDateRange(requestedDate);
  const monthStart = new Date(`${requestedDate.slice(0, 7)}-01T00:00:00+07:00`);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);
  const chartStart = new Date(dayStart);
  chartStart.setUTCDate(chartStart.getUTCDate() - 6);

  try {
    const courts = await prisma.court.findMany({
      where: { ownerId: session.userId, isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        fields: {
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const courtIds = courts.map((court) => court.id);
    const selectedCourtId = url.searchParams.get("courtId");
    const scopedCourtIds = selectedCourtId && courtIds.includes(selectedCourtId)
      ? [selectedCourtId]
      : courtIds;

    const bookings = scopedCourtIds.length
      ? await prisma.booking.findMany({
          where: {
            courtId: { in: scopedCourtIds },
            slots: { some: { startsAt: { gte: chartStart, lt: nextMonthStart } } },
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            user: { select: { id: true, fullName: true, phone: true } },
            court: { select: { id: true, name: true } },
            slots: {
              select: {
                id: true,
                startsAt: true,
                endsAt: true,
                courtField: { select: { id: true, name: true } },
              },
              orderBy: { startsAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const todayBookings = bookings.filter((booking) =>
      booking.slots.some((slot) => slot.startsAt >= dayStart && slot.startsAt <= dayEnd),
    );
    const monthBookings = bookings.filter((booking) =>
      booking.slots.some((slot) => slot.startsAt >= monthStart && slot.startsAt < nextMonthStart),
    );
    const paidToday = todayBookings.filter((booking) => booking.status !== "CANCELLED");
    const paidMonth = monthBookings.filter((booking) => booking.status !== "CANCELLED");
    const allFields = courts
      .filter((court) => scopedCourtIds.includes(court.id))
      .flatMap((court) => court.fields.map((field) => ({ ...field, courtId: court.id, courtName: court.name })));
    const now = new Date();

    const fieldStatuses = allFields.map((field) => {
      const fieldSlots = todayBookings
        .filter((booking) => booking.status !== "CANCELLED")
        .flatMap((booking) => booking.slots.map((slot) => ({ ...slot, booking })))
        .filter((slot) => slot.courtField.id === field.id)
        .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());
      const current = fieldSlots.find((slot) => slot.startsAt <= now && slot.endsAt > now);
      const next = fieldSlots.find((slot) => slot.startsAt > now);

      return {
        id: field.id,
        name: field.name,
        courtName: field.courtName,
        state: current ? "OCCUPIED" : next ? "UPCOMING" : "AVAILABLE",
        current: current ? {
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          customerName: current.booking.user.fullName,
        } : null,
        next: next ? {
          startsAt: next.startsAt,
          customerName: next.booking.user.fullName,
        } : null,
      };
    });

    const chart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(chartStart);
      date.setUTCDate(chartStart.getUTCDate() + index);
      const dateKey = vietnamDateString(date);
      const range = getDateRange(dateKey);
      const revenue = bookings
        .filter((booking) => booking.status !== "CANCELLED")
        .filter((booking) => booking.slots.some((slot) => slot.startsAt >= range.start && slot.startsAt <= range.end))
        .reduce((total, booking) => total + booking.totalAmount, 0);
      return { date: dateKey, revenue };
    });

    const statusCounts = bookings.reduce<Record<string, number>>((counts, booking) => {
      counts[booking.status] = (counts[booking.status] ?? 0) + 1;
      return counts;
    }, {});

    return jsonResponse({
      success: true,
      data: {
        date: requestedDate,
        courts,
        selectedCourtId: scopedCourtIds.length === 1 ? scopedCourtIds[0] : null,
        stats: {
          todayRevenue: paidToday.reduce((total, booking) => total + booking.totalAmount, 0),
          monthRevenue: paidMonth.reduce((total, booking) => total + booking.totalAmount, 0),
          todayBookingCount: todayBookings.length,
          pendingCount: todayBookings.filter((booking) => booking.status === "PENDING").length,
          availableFieldCount: fieldStatuses.filter((field) => field.state === "AVAILABLE").length,
          totalFieldCount: allFields.length,
          occupancyRate: allFields.length
            ? Math.round(((allFields.length - fieldStatuses.filter((field) => field.state === "AVAILABLE").length) / allFields.length) * 100)
            : 0,
        },
        chart,
        statusCounts,
        fieldStatuses,
        todayBookings,
      },
    });
  } catch (error) {
    console.error("Không thể tải dashboard chủ sân:", error);
    return jsonResponse({ success: false, message: "Không thể tải dashboard chủ sân" }, 500);
  }
}
