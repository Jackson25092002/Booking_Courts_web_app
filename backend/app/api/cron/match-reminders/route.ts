import { timingSafeEqual } from "node:crypto";
import { jsonResponse } from "@/lib/http";
import { sendMatchShortageReminders } from "@/lib/match-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return jsonResponse({ message: "Chưa cấu hình lịch nhắc kèo" }, 503);
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") || "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return jsonResponse({ message: "Không được phép" }, 401);
  try {
    const sent = await sendMatchShortageReminders();
    return jsonResponse({ success: true, data: { sent } });
  } catch {
    return jsonResponse({ message: "Không thể kiểm tra nhắc kèo" }, 500);
  }
}
