import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập" }, 401);
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã kèo không hợp lệ" }, 400);
  try {
    const participant = await prisma.matchParticipant.findUnique({ where: { matchId_userId: { matchId: id, userId: session.userId } } });
    return jsonResponse({ success: true, data: { joined: !!participant } });
  } catch {
    return jsonResponse({ message: "Không thể kiểm tra trạng thái tham gia" }, 500);
  }
}

export async function POST(request: Request, context: Context) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập để tham gia kèo" }, 401);
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã kèo không hợp lệ" }, 400);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id } });
      if (!match) return { status: 404, message: "Không tìm thấy kèo" };
      if (match.organizerId === session.userId) return { status: 403, message: "Bạn là người tổ chức kèo này" };
      const existing = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId: id, userId: session.userId } } });
      if (existing) return { status: 200, message: "Bạn đã tham gia kèo này" };
      if (match.status !== "OPEN" || match.startsAt <= new Date() || match.currentPlayers >= match.maxPlayers) {
        return { status: 409, message: "Kèo đã đủ người, đóng tuyển hoặc đã đến giờ chơi" };
      }
      const updated = await tx.match.updateMany({
        where: { id, status: "OPEN", updatedAt: match.updatedAt, currentPlayers: match.currentPlayers,
          maxPlayers: match.maxPlayers, startsAt: { gt: new Date() } },
        data: { currentPlayers: { increment: 1 }, status: match.currentPlayers + 1 >= match.maxPlayers ? "FULL" : "OPEN" },
      });
      if (updated.count !== 1) return { status: 409, message: "Kèo vừa thay đổi. Vui lòng thử lại" };
      // Unique membership and count update commit together; conflicts roll back both.
      await tx.matchParticipant.create({ data: { matchId: id, userId: session.userId } });
      const participant = await tx.user.findUnique({ where: { id: session.userId }, select: { fullName: true } });
      await tx.notification.create({ data: {
        userId: match.organizerId, matchId: id, kind: "MATCH_JOINED",
        message: `${participant?.fullName || "Một thành viên"} đã xác nhận tham gia kèo “${match.title}”. Hiện có ${match.currentPlayers + 1}/${match.maxPlayers} người.`.slice(0, 500),
      } });
      return { status: 200, message: "Tham gia kèo thành công" };
    });
    return jsonResponse({ success: result.status === 200, message: result.message }, result.status);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002" || code === "P2034") return jsonResponse({ message: "Kèo vừa thay đổi hoặc bạn đã tham gia. Vui lòng tải lại" }, 409);
    return jsonResponse({ message: "Không thể tham gia kèo. Vui lòng thử lại" }, 500);
  }
}

// Leaving affects only this user's membership, never cancels the whole match.
export async function DELETE(request: Request, context: Context) {
  const session = await getAuthSession(request);
  if (!session) return jsonResponse({ message: "Vui lòng đăng nhập để hủy tham gia" }, 401);
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonResponse({ message: "Mã kèo không hợp lệ" }, 400);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id } });
      if (!match) return { status: 404, message: "Không tìm thấy kèo" };
      if (match.organizerId === session.userId) return { status: 403, message: "Người tổ chức cần dùng chức năng quản lý kèo" };
      const member = await tx.matchParticipant.findUnique({ where: { matchId_userId: { matchId: id, userId: session.userId } } });
      if (!member) return { status: 200, message: "Bạn không còn tham gia kèo này" };
      if (match.startsAt <= new Date() || ["CANCELLED", "COMPLETED"].includes(match.status))
        return { status: 409, message: "Kèo đã bắt đầu, hủy hoặc hoàn thành; không thể hủy tham gia" };
      const updated = await tx.match.updateMany({
        where: { id, updatedAt: match.updatedAt, status: match.status, currentPlayers: match.currentPlayers, startsAt: { gt: new Date() } },
        data: { currentPlayers: { decrement: 1 }, status: match.status === "FULL" ? "OPEN" : match.status },
      });
      if (updated.count !== 1) return { status: 409, message: "Kèo vừa thay đổi. Vui lòng tải lại và thử lại" };
      await tx.matchParticipant.delete({ where: { matchId_userId: { matchId: id, userId: session.userId } } });
      const participant = await tx.user.findUnique({ where: { id: session.userId }, select: { fullName: true } });
      await tx.notification.create({ data: {
        userId: match.organizerId, matchId: id, kind: "MATCH_LEFT",
        message: `${participant?.fullName || "Một thành viên"} đã hủy tham gia kèo “${match.title}”. Hiện còn ${match.currentPlayers - 1}/${match.maxPlayers} người.`.slice(0, 500),
      } });
      return { status: 200, message: "Đã hủy tham gia kèo" };
    });
    return jsonResponse({ success: result.status === 200, message: result.message }, result.status);
  } catch (error) {
    if ((error as { code?: string }).code === "P2034") return jsonResponse({ message: "Kèo vừa thay đổi. Vui lòng thử lại" }, 409);
    return jsonResponse({ message: "Không thể hủy tham gia kèo. Vui lòng thử lại" }, 500);
  }
}
