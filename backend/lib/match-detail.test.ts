import assert from "node:assert/strict";
import test from "node:test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "isolated-test-secret-not-a-real-key";

test("detail and management: ownership, validation, closed state, cancellation and races", async () => {
  const { GET, PATCH } = await import("../app/api/matches/[id]/route");
  const { createAccessToken } = await import("./auth");
  const { default: prisma } = await import("./prisma");
  const owner = "11111111-1111-4111-8111-111111111111";
  const id = "22222222-2222-4222-8222-222222222222";
  const token = (await createAccessToken({ userId: owner, email: "owner@example.com", role: "CUSTOMER" })).token;
  const other = (await createAccessToken({ userId: "33333333-3333-4333-8333-333333333333", email: "other@example.com", role: "ADMIN" })).token;
  const context = { params: Promise.resolve({ id }) };
  const request = (body: unknown, bearer = token) => new Request(`http://localhost/api/matches/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify(body),
  });
  let found = true;
  let race = false;
  let writes = 0;
  const match = { id, organizerId: owner, title: "Kèo test", courtId: owner, level: "Khá", description: null,
    startsAt: new Date(Date.now() + 86400000), updatedAt: new Date(), status: "OPEN", maxPlayers: 4, currentPlayers: 1 };
  const originalFind = prisma.match.findUnique;
  const originalUpdate = prisma.match.updateMany;
  const originalCourt = prisma.court.findFirst;
  prisma.match.findUnique = (async () => found ? { ...match } : null) as unknown as typeof originalFind;
  prisma.match.updateMany = (async ({ where, data }: { where: { organizerId: string; status: string }; data: object }) => {
    assert.equal(where.organizerId, owner);
    assert.equal(where.status, match.status);
    if (race) return { count: 0 };
    Object.assign(match, data); writes++;
    return { count: 1 };
  }) as unknown as typeof originalUpdate;
  prisma.court.findFirst = (async () => ({ id: owner })) as unknown as typeof originalCourt;
  try {
    assert.equal((await GET(new Request("http://localhost"), context)).status, 200);
    assert.equal((await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "bad" }) })).status, 400);
    assert.equal((await PATCH(request({ action: "close" }, ""), context)).status, 401);
    assert.equal((await PATCH(request({ action: "close" }, other), context)).status, 403);
    assert.equal((await PATCH(request({ action: "unknown" }), context)).status, 400);
    found = false;
    assert.equal((await PATCH(request({ action: "close" }), context)).status, 404);
    found = true;
    const data = { courtId: owner, title: "Kèo cập nhật", level: "Khá", startsAt: new Date(Date.now() + 86400000).toISOString(), currentPlayers: 4, maxPlayers: 4 };
    assert.equal((await PATCH(request({ action: "edit", data }), context)).status, 200);
    assert.equal(match.status, "FULL");
    assert.equal((await PATCH(request({ action: "edit", data: { ...data, currentPlayers: 5 } }), context)).status, 400);
    assert.equal((await PATCH(request({ action: "close" }), context)).status, 200);
    assert.equal(match.status, "CLOSED");
    const previousWrites = writes;
    assert.equal((await PATCH(request({ action: "close" }), context)).status, 200);
    assert.equal(writes, previousWrites);
    assert.equal((await PATCH(request({ action: "edit", data: { ...data, currentPlayers: 2 } }), context)).status, 200);
    assert.equal(match.status, "CLOSED", "Edit must not reopen recruitment");
    race = true;
    assert.equal((await PATCH(request({ action: "cancel" }), context)).status, 409);
    race = false;
    assert.equal((await PATCH(request({ action: "cancel" }), context)).status, 200);
    assert.equal(match.status, "CANCELLED");
    assert.equal((await PATCH(request({ action: "edit", data }), context)).status, 409);
    assert.equal((await PATCH(request({ action: "cancel" }), context)).status, 200);
    match.status = "OPEN"; match.startsAt = new Date(Date.now() - 1000);
    assert.equal((await PATCH(request({ action: "close" }), context)).status, 409);
  } finally {
    prisma.match.findUnique = originalFind; prisma.match.updateMany = originalUpdate; prisma.court.findFirst = originalCourt;
  }
});
