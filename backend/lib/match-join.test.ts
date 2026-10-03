import assert from "node:assert/strict";
import test from "node:test";
import { post, stub, customerToken, userId, courtId } from "./test-support";
import prisma from "./prisma";
import { POST } from "../app/api/matches/[id]/join/route";

for (const scenario of ["success", "lastPlace", "duplicate", "full", "closed", "past", "owner", "missing", "race", "anonymous"]) {
  test(`join match: ${scenario}`, async (t) => {
    let writes = 0;
    let members = 0;
    const tx = {
      user: { findUnique: async () => ({ fullName: "Người tham gia" }) },
      notification: { create: async ({ data }: { data: { userId: string; matchId: string; kind: string } }) => {
        assert.equal(data.userId, courtId); assert.equal(data.matchId, courtId); assert.equal(data.kind, "MATCH_JOINED");
        return data;
      } },
      match: {
        findUnique: async () => scenario === "missing" ? null : ({
          id: courtId, organizerId: scenario === "owner" ? userId : courtId,
          status: scenario === "closed" ? "CLOSED" : "OPEN", updatedAt: new Date(),
          startsAt: new Date(Date.now() + (scenario === "past" ? -86400000 : 86400000)),
          maxPlayers: 4, currentPlayers: scenario === "full" ? 4 : scenario === "lastPlace" ? 3 : 1,
        }),
        updateMany: async ({ data, where }: { data: { status: string; currentPlayers: { increment: number } }; where: { currentPlayers: number } }) => {
          assert.equal(data.currentPlayers.increment, 1);
          assert.equal(data.status, scenario === "lastPlace" ? "FULL" : "OPEN");
          assert.equal(where.currentPlayers, scenario === "lastPlace" ? 3 : 1);
          if (scenario === "race") return { count: 0 };
          writes++; return { count: 1 };
        },
      },
      matchParticipant: {
        findUnique: async () => scenario === "duplicate" ? { userId } : null,
        create: async ({ data }: { data: { userId: string; matchId: string } }) => {
          assert.equal(data.userId, userId); assert.equal(data.matchId, courtId); members++; return data;
        },
      },
    };
    stub(t, prisma, "$transaction", async (fn: (value: typeof tx) => unknown) => fn(tx));
    const response = await POST(post(`/api/matches/${courtId}/join`, {}, scenario === "anonymous" ? undefined : await customerToken()), { params: Promise.resolve({ id: courtId }) });
    const expected = ["success", "lastPlace", "duplicate"].includes(scenario) ? 200 : scenario === "owner" ? 403 : scenario === "missing" ? 404 : scenario === "anonymous" ? 401 : 409;
    assert.equal(response.status, expected);
    assert.equal(writes, ["success", "lastPlace"].includes(scenario) ? 1 : 0);
    assert.equal(members, writes);
  });
}
