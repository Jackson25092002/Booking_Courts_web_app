import { z } from "zod";
import { isValidDateString } from "@/lib/booking-time";

export const availabilityQuerySchema = z.object({
  date: z.string().refine(isValidDateString, "Ngày chơi không hợp lệ"),
  duration: z.coerce
    .number()
    .min(0.5)
    .max(12)
    .refine((value) => Number.isInteger(value * 2), "Thời lượng phải theo bước 30 phút")
    .default(1),
});

const bookingSelectionSchema = z.object({
  courtFieldId: z.string().uuid("Mã sân con không hợp lệ"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
});

export const createBookingSchema = z.object({
  courtId: z.string().uuid("Mã sân không hợp lệ"),
  courtFieldId: z.string().uuid("Mã sân con không hợp lệ").optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  selections: z.array(bookingSelectionSchema).min(1).max(100).optional(),
  note: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  const hasSingleSelection = Boolean(
    value.courtFieldId && value.startsAt && value.endsAt,
  );

  if (!value.selections?.length && !hasSingleSelection) {
    context.addIssue({
      code: "custom",
      message: "Cần chọn ít nhất một khung giờ",
      path: ["selections"],
    });
  }
});
