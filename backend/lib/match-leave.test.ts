import assert from "node:assert/strict";
import test from "node:test";
import { post, stub, customerToken, userId, courtId } from "./test-support";
import prisma from "./prisma";
import { DELETE } from "../app/api/matches/[id]/join/route";

for (const scenario of ["open", "full", "closed", "duplicate", "past", "cancelled", "completed", "owner", "missing", "race", "anonymous"]) {
  test(`leave match: ${scenario}`, async (t) => {
    const writes: string[] = [];
    const status = scenario === "full" ? "FULL" : scenario === "closed" ? "CLOSED" : scenario === "cancelled" ? "CANCELLED" : scenario === "completed" ? "COMPLETED" : "OPEN";
    const tx = {
      match: {
        findUnique: async () => scenario === "missing" ? null : ({
          id: courtId, title: "Kèo test", organizerId: scenario === "owner" ? userId : courtId,
          status, updatedAt: new Date(), startsAt: new Date(Date.now() + (scenario === "past" ? -86400000 : 86400000)),
          currentPlayers: 4, maxPlayers: 4,
        }),
        updateMany: async ({ data }: { data: { currentPlayers: { decrement: number }; status: string } }) => {
          assert.equal(data.currentPlayers.decrement, 1);
          assert.equal(data.status, status === "FULL" ? "OPEN" : status);
          if (scenario === "race") return { count: 0 };
          writes.push("count"); return { count: 1 };
        },
      },
      matchParticipant: {
        findUnique: async () => scenario === "duplicate" ? null : ({ userId }),
        delete: async ({ where }: { where: { matchId_userId: { userId: string; matchId: string } } }) => {
          assert.deepEqual(where.matchId_userId, { userId, matchId: courtId }); writes.push("member");
        },
      },
      user: { findUnique: async () => ({ fullName: "Người tham gia" }) },
      notification: { create: async ({ data }: { data: { userId: string; matchId: string; kind: string; message: string } }) => {
        assert.equal(data.userId, courtId); assert.equal(data.matchId, courtId);
        assert.equal(data.kind, "MATCH_LEFT"); assert.match(data.message, /3\/4/); writes.push("notice");
      } },
    };
    stub(t, prisma, "$transaction", async (fn: (client: typeof tx) => unknown) => fn(tx));
    const response = await DELETE(post(`/api/matches/${courtId}/join`, {}, scenario === "anonymous" ? undefined : await customerToken()), { params: Promise.resolve({ id: courtId }) });
    const success = ["open", "full", "closed"].includes(scenario);
    assert.equal(response.status, success || scenario === "duplicate" ? 200 : scenario === "owner" ? 403 : scenario === "missing" ? 404 : scenario === "anonymous" ? 401 : 409);
    assert.deepEqual(writes, success ? ["count", "member", "notice"] : []);
  });
}
