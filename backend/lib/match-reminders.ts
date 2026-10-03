import prisma from "@/lib/prisma";

export const MATCH_REMINDER_WINDOW_MS = 8 * 60 * 60 * 1000;

// Run by an authenticated scheduler, or as a fallback when the organizer loads
// notifications. A persisted claim and its notification commit atomically.
export async function sendMatchShortageReminders(now = new Date(), organizerId?: string) {
  let sent = 0;
  let cursor: string | undefined;
  for (;;) {
    const matches = await prisma.match.findMany({
      where: { status: "OPEN", shortageNotifiedAt: null,
        startsAt: { gt: now, lte: new Date(now.getTime() + MATCH_REMINDER_WINDOW_MS) },
        ...(organizerId ? { organizerId } : {}),
      },
      select: { id: true, organizerId: true, title: true, startsAt: true, updatedAt: true, currentPlayers: true, maxPlayers: true },
      orderBy: { id: "asc" }, take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const match of matches) {
      if (match.currentPlayers >= match.maxPlayers) continue;
      const count = await prisma.$transaction(async (tx) => {
        const claim = await tx.match.updateMany({
          where: { id: match.id, status: "OPEN", shortageNotifiedAt: null,
            updatedAt: match.updatedAt, currentPlayers: match.currentPlayers, maxPlayers: match.maxPlayers,
            startsAt: match.startsAt },
          data: { shortageNotifiedAt: now },
        });
        if (!claim.count) return 0;
        await tx.notification.create({ data: {
          userId: match.organizerId, matchId: match.id, kind: "MATCH_SHORTAGE",
          message: `Kèo “${match.title}” còn không quá 8 tiếng tới giờ bắt đầu nhưng mới có ${match.currentPlayers}/${match.maxPlayers} người. Bạn có thể tiếp tục tuyển, đóng tuyển hoặc hủy kèo trước khi quyết định đặt sân.`.slice(0, 500),
        } });
        return 1;
      });
      sent += count;
    }
    if (matches.length < 100) break;
    cursor = matches[matches.length - 1].id;
  }
  return sent;
}
