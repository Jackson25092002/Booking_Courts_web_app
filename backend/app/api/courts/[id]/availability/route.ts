import prisma from "@/lib/prisma";
import {
  ACTIVE_BOOKING_STATUSES,
  createVietnamDateTime,
  intervalsOverlap,
  minutesToTime,
  timeToMinutes,
} from "@/lib/booking-time";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { availabilityQuerySchema } from "@/lib/validators/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

interface AvailabilityRouteContext {
  params: Promise<{ id: string }>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: AvailabilityRouteContext) {
  const { id } = await context.params;
  const query = availabilityQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!query.success) {
    return jsonResponse(
      {
        success: false,
        message: "Thông tin kiểm tra lịch không hợp lệ",
        errors: query.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { date, duration } = query.data;
  const court = await prisma.court.findFirst({
    where: {
      isActive: true,
      ...(uuidPattern.test(id) ? { id } : { slug: id }),
    },
    select: {
      id: true,
      name: true,
      openTime: true,
      closeTime: true,
      fields: {
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!court) {
    return jsonResponse(
      { success: false, message: "Không tìm thấy sân" },
      404,
    );
  }

  const dayStart = createVietnamDateTime(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const bookedSlots = await prisma.bookingSlot.findMany({
    where: {
      courtField: { courtId: court.id },
      booking: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: {
      courtFieldId: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const openMinutes = timeToMinutes(court.openTime);
  const closeMinutes = timeToMinutes(court.closeTime);
  const durationMinutes = duration * 60;
  const possibleSlots: Array<{
    label: string;
    startsAt: Date;
    endsAt: Date;
  }> = [];

  for (
    let startMinutes = openMinutes;
    startMinutes + durationMinutes <= closeMinutes;
    startMinutes += 30
  ) {
    const startsAt = createVietnamDateTime(date, minutesToTime(startMinutes));
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
    possibleSlots.push({
      label: minutesToTime(startMinutes),
      startsAt,
      endsAt,
    });
  }

  return jsonResponse({
    success: true,
    data: {
      courtId: court.id,
      courtName: court.name,
      date,
      duration,
      fields: court.fields.map((field) => ({
        ...field,
        slots: possibleSlots.map((slot) => ({
          label: slot.label,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
          available:
            slot.startsAt.getTime() > Date.now() &&
            !bookedSlots.some(
              (bookedSlot) =>
                bookedSlot.courtFieldId === field.id &&
                intervalsOverlap(
                  slot.startsAt,
                  slot.endsAt,
                  bookedSlot.startsAt,
                  bookedSlot.endsAt,
                ),
            ),
        })),
      })),
    },
  });
}
