import assert from "node:assert/strict";
import test from "node:test";
import { stub, userId, courtId } from "./test-support";
import prisma from "./prisma";
import { sendMatchShortageReminders, MATCH_REMINDER_WINDOW_MS } from "./match-reminders";
import { GET } from "../app/api/cron/match-reminders/route";

test("8-hour reminder selects only upcoming open unnotified matches for the organizer", async (t) => {
  const now = new Date("2026-10-03T00:00:00Z");
  stub(t, prisma.match, "findMany", async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { status: "OPEN", shortageNotifiedAt: null, organizerId: userId,
      startsAt: { gt: now, lte: new Date(now.getTime() + MATCH_REMINDER_WINDOW_MS) } });
    return [];
  });
  assert.equal(await sendMatchShortageReminders(now, userId), 0);
});

for (const scenario of ["shortage", "enough", "claimed"]) {
  test(`8-hour reminder: ${scenario}`, async (t) => {
    let notices = 0;
    const now = new Date();
    stub(t, prisma.match, "findMany", async () => [{ id: courtId, organizerId: userId, title: "Kèo test",
      startsAt: new Date(now.getTime() + 3600000), updatedAt: now, currentPlayers: scenario === "enough" ? 4 : 2, maxPlayers: 4 }]);
    stub(t, prisma, "$transaction", async (fn: (tx: unknown) => unknown) => fn({
      match: { updateMany: async ({ where, data }: { where: { shortageNotifiedAt: null }; data: Record<string, unknown> }) => {
        assert.equal(where.shortageNotifiedAt, null);
        assert.deepEqual(data, { shortageNotifiedAt: now }); // Never closes/cancels.
        return { count: scenario === "claimed" ? 0 : 1 };
      } },
      notification: { create: async ({ data }: { data: { userId: string; matchId: string; kind: string; message: string } }) => {
        assert.equal(data.userId, userId); assert.equal(data.matchId, courtId);
        assert.equal(data.kind, "MATCH_SHORTAGE"); assert.match(data.message, /2\/4/); notices++;
      } },
    }));
    assert.equal(await sendMatchShortageReminders(now), scenario === "shortage" ? 1 : 0);
    assert.equal(notices, scenario === "shortage" ? 1 : 0);
  });
}

test("cron rejects missing config, missing token and wrong token without database access", async (t) => {
  const before = process.env.CRON_SECRET;
  t.after(() => { if (before === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = before; });
  const find = stub(t, prisma.match, "findMany", async () => []);
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("https://backend.example.com/api/cron/match-reminders"))).status, 503);
  process.env.CRON_SECRET = "x".repeat(32);
  assert.equal((await GET(new Request("https://backend.example.com/api/cron/match-reminders"))).status, 401);
  assert.equal((await GET(new Request("https://backend.example.com/api/cron/match-reminders", { headers: { Authorization: `Bearer ${"y".repeat(32)}` } }))).status, 401);
  assert.equal(find.mock.callCount(), 0);
  const response = await GET(new Request("https://backend.example.com/api/cron/match-reminders", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.sent, 0);
});
