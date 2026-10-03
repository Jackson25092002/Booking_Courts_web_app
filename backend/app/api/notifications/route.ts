import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { sendMatchShortageReminders } from "@/lib/match-reminders";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;
export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập." }, 401);
  await sendMatchShortageReminders(new Date(), session.userId);
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
  ]);
  return jsonResponse({ data: { notifications, unreadCount } });
}
export async function PATCH(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập." }, 401);
  const input = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonResponse({ message: "Thông báo không hợp lệ." }, 400);
  await prisma.notification.updateMany({ where: { id: input.data.id, userId: session.userId, readAt: null }, data: { readAt: new Date() } });
  return jsonResponse({ success: true });
}
