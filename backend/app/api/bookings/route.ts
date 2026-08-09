import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import {
  ACTIVE_BOOKING_STATUSES,
  getVietnamDateTimeParts,
  timeToMinutes,
} from "@/lib/booking-time";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { createBookingSchema } from "@/lib/validators/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

class BookingRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface NormalizedSelection {
  courtFieldId: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
}

function hasPrismaCode(error: unknown, codes: string[]) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    codes.includes(error.code)
  );
}

function validateSelectionTimes(selections: NormalizedSelection[]) {
  for (const selection of selections) {
    if (
      selection.startsAt.getTime() <= Date.now() ||
      !Number.isInteger(selection.durationMinutes) ||
      selection.durationMinutes < 30 ||
      selection.durationMinutes % 30 !== 0
    ) {
      throw new BookingRequestError(400, "Thời gian đặt sân không hợp lệ");
    }
  }

  const selectionsByField = new Map<string, NormalizedSelection[]>();

  for (const selection of selections) {
    const fieldSelections = selectionsByField.get(selection.courtFieldId) ?? [];
    fieldSelections.push(selection);
    selectionsByField.set(selection.courtFieldId, fieldSelections);
  }

  for (const fieldSelections of selectionsByField.values()) {
    const sortedSelections = [...fieldSelections].sort(
      (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
    );

    for (let index = 1; index < sortedSelections.length; index += 1) {
      if (sortedSelections[index].startsAt < sortedSelections[index - 1].endsAt) {
        throw new BookingRequestError(
          400,
          "Các khoảng giờ trên cùng một sân con không được chồng nhau",
        );
      }
    }
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession(request);

  if (!session) {
    return jsonResponse(
      { success: false, message: "Vui lòng đăng nhập để đặt sân" },
      401,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { success: false, message: "Nội dung JSON không hợp lệ" },
      400,
    );
  }

  const parsedBody = createBookingSchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonResponse(
      {
        success: false,
        message: "Thông tin đặt sân không hợp lệ",
        errors: parsedBody.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { courtId, note } = parsedBody.data;
  const requestSelections = parsedBody.data.selections?.length
    ? parsedBody.data.selections
    : [{
        courtFieldId: parsedBody.data.courtFieldId!,
        startsAt: parsedBody.data.startsAt!,
        endsAt: parsedBody.data.endsAt!,
      }];
  const selections: NormalizedSelection[] = requestSelections.map((selection) => {
    const startsAt = new Date(selection.startsAt);
    const endsAt = new Date(selection.endsAt);

    return {
      courtFieldId: selection.courtFieldId,
      startsAt,
      endsAt,
      durationMinutes: (endsAt.getTime() - startsAt.getTime()) / (60 * 1000),
    };
  });

  try {
    validateSelectionTimes(selections);

    const booking = await prisma.$transaction(
      async (transaction) => {
        const fieldIds = Array.from(
          new Set(selections.map((selection) => selection.courtFieldId)),
        );
        const fields = await transaction.courtField.findMany({
          where: {
            id: { in: fieldIds },
            courtId,
            isActive: true,
            court: { isActive: true },
          },
          include: { court: true },
        });

        if (fields.length !== fieldIds.length) {
          throw new BookingRequestError(404, "Không tìm thấy sân con phù hợp");
        }

        const fieldsById = new Map(fields.map((field) => [field.id, field]));

        for (const selection of selections) {
          const field = fieldsById.get(selection.courtFieldId)!;
          const localStart = getVietnamDateTimeParts(selection.startsAt);
          const localEnd = getVietnamDateTimeParts(selection.endsAt);
          const startMinutes = timeToMinutes(localStart.time);
          const endMinutes = timeToMinutes(localEnd.time);

          if (
            localStart.date !== localEnd.date ||
            startMinutes % 30 !== 0 ||
            endMinutes % 30 !== 0 ||
            startMinutes < timeToMinutes(field.court.openTime) ||
            endMinutes > timeToMinutes(field.court.closeTime)
          ) {
            throw new BookingRequestError(
              400,
              "Thời gian đặt phải nằm trong giờ hoạt động của sân",
            );
          }
        }

        const conflict = await transaction.bookingSlot.findFirst({
          where: {
            booking: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
            OR: selections.map((selection) => ({
              courtFieldId: selection.courtFieldId,
              startsAt: { lt: selection.endsAt },
              endsAt: { gt: selection.startsAt },
            })),
          },
          select: { id: true },
        });

        if (conflict) {
          throw new BookingRequestError(
            409,
            "Một trong các khung giờ vừa được đặt. Vui lòng kiểm tra lại",
          );
        }

        const slotData = selections.map((selection) => {
          const field = fieldsById.get(selection.courtFieldId)!;
          const price = Math.round(
            (field.court.pricePerHour * selection.durationMinutes) / 60,
          );

          return {
            courtFieldId: selection.courtFieldId,
            startsAt: selection.startsAt,
            endsAt: selection.endsAt,
            price,
          };
        });
        const totalAmount = slotData.reduce((total, slot) => total + slot.price, 0);

        return transaction.booking.create({
          data: {
            userId: session.userId,
            courtId,
            status: "PENDING",
            totalAmount,
            note,
            slots: { create: slotData },
          },
          include: {
            court: {
              select: { id: true, name: true, address: true, district: true },
            },
            slots: {
              include: {
                courtField: { select: { id: true, name: true } },
              },
              orderBy: { startsAt: "asc" },
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    return jsonResponse(
      {
        success: true,
        message: "Đặt sân thành công",
        data: { booking },
      },
      201,
    );
  } catch (error) {
    if (error instanceof BookingRequestError) {
      return jsonResponse(
        { success: false, message: error.message },
        error.status,
      );
    }

    if (hasPrismaCode(error, ["P2002", "P2034"])) {
      return jsonResponse(
        {
          success: false,
          message: "Một trong các khung giờ vừa được đặt. Vui lòng kiểm tra lại",
        },
        409,
      );
    }

    console.error("Không thể tạo đơn đặt sân:", error);
    return jsonResponse(
      { success: false, message: "Không thể tạo đơn đặt sân" },
      500,
    );
  }
}
