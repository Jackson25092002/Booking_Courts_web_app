import { z } from "zod";
import { isValidDateString } from "./booking-time";

export const matchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  level: z.string().trim().max(50).optional(),
  date: z.string().refine(isValidDateString, "Ngày không hợp lệ").optional(),
  period: z.enum(["all", "weekend"]).default("all"),
  sort: z.enum(["soonest", "newest"]).default("soonest"),
  status: z.enum(["OPEN", "FULL", "CLOSED", "CANCELLED", "COMPLETED"]).default("OPEN"),
}).refine((value) => !(value.date && value.period === "weekend"), {
  message: "Chọn một ngày cụ thể hoặc cuối tuần", path: ["date"],
});

export function matchTimeRange(query: { date?: string; period: string }, now = new Date()) {
  const dayMs = 86400000;
  let start: Date | undefined;
  let end: Date | undefined;
  if (query.date) {
    start = new Date(`${query.date}T00:00:00+07:00`);
    end = new Date(start.getTime() + dayMs);
  } else if (query.period === "weekend") {
    // Saturday/Sunday of the current (or next upcoming) weekend in Vietnam.
    const local = new Date(now.getTime() + 7 * 3600000);
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 7 * 3600000;
    const weekday = local.getUTCDay();
    start = new Date(midnight + (weekday === 0 ? -1 : 6 - weekday) * dayMs);
    end = new Date(start.getTime() + 2 * dayMs);
  }
  return { gt: now, ...(start ? { gte: start, lt: end } : {}) };
}
