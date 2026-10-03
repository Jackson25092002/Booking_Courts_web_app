import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { changeMatchSchema } from "@/lib/validators/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;
type Context = { params: Promise<{ id: string }> };
const detailSelect = {
  id: true, title: true, description: true, level: true, startsAt: true,
  maxPlayers: true, currentPlayers: true, status: true,
  organizer: { select: { id: true, fullName: true, avatarUrl: true } },
  court: { select: { id: true, name: true, district: true, address: true,
    pricePerHour: true, latitude: true, longitude: true } },
} as const;

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã kèo không hợp lệ" }, 400);
  try {
    const match = await prisma.match.findUnique({ where: { id }, select: detailSelect });
    if (!match) return jsonResponse({ message: "Không tìm thấy kèo" }, 404);
    return jsonResponse({ success: true, data: match });
  } catch {
    return jsonResponse({ message: "Không thể tải thông tin kèo" }, 500);
  }
}

export async function PATCH(request: Request, context: Context) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập để quản lý kèo" }, 401);
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã kèo không hợp lệ" }, 400);
  const input = changeMatchSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonResponse({ message: "Thông tin cập nhật không hợp lệ", errors: input.error.flatten().fieldErrors }, 400);
  try {
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return jsonResponse({ message: "Không tìm thấy kèo" }, 404);
    if (match.organizerId !== session.userId) return jsonResponse({ message: "Chỉ người đăng được quản lý kèo này" }, 403);
    const { action } = input.data;
    if ((action === "cancel" && match.status === "CANCELLED") || (action === "close" && match.status === "CLOSED")) {
      return GET(request, context);
    }
    if (["CANCELLED", "COMPLETED"].includes(match.status) || match.startsAt <= new Date()) {
      return jsonResponse({ message: "Kèo đã hủy, hoàn thành hoặc đã đến giờ chơi không thể thay đổi" }, 409);
    }
    let data;
    if (input.data.action === "edit") {
      const fields = input.data.data;
      if (fields.currentPlayers !== match.currentPlayers &&
          await prisma.matchParticipant.count({ where: { matchId: id } }) > 0) {
        return jsonResponse({ message: "Kèo đã có người tham gia trực tuyến. Không thể sửa số người hiện có" }, 409);
      }
      if (new Date(fields.startsAt) <= new Date()) return jsonResponse({ message: "Giờ chơi phải ở tương lai" }, 400);
      const court = await prisma.court.findFirst({ where: { id: fields.courtId, isActive: true }, select: { id: true } });
      if (!court) return jsonResponse({ message: "Sân không tồn tại hoặc đã ngừng hoạt động" }, 404);
      const status = match.status === "CLOSED" ? "CLOSED" as const : fields.currentPlayers === fields.maxPlayers ? "FULL" as const : "OPEN" as const;
      data = { ...fields, description: fields.description || null, startsAt: new Date(fields.startsAt), status,
        ...(new Date(fields.startsAt).getTime() !== match.startsAt.getTime() ? { shortageNotifiedAt: null } : {}) };
    } else {
      data = { status: input.data.action === "close" ? "CLOSED" as const : "CANCELLED" as const };
    }
    // Optimistic concurrency: an edit cannot overwrite a concurrent cancellation.
    const result = await prisma.match.updateMany({
      where: { id, organizerId: session.userId, updatedAt: match.updatedAt, status: match.status, currentPlayers: match.currentPlayers }, data,
    });
    if (result.count !== 1) return jsonResponse({ message: "Kèo vừa thay đổi. Vui lòng tải lại và thử lại" }, 409);
    return GET(request, context);
  } catch {
    return jsonResponse({ message: "Không thể cập nhật kèo. Vui lòng thử lại" }, 500);
  }
}
