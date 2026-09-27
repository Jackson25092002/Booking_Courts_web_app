import assert from "node:assert/strict";
import test from "node:test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-only-secret-long-enough";
test("owner confirmation enforces login, role, ownership, full payment and idempotent notification", async () => {
  const { POST } = await import("../app/api/owner/bookings/confirm/route");
  const { createAccessToken } = await import("./auth");
  const { default: prisma } = await import("./prisma");
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const bookingId = "22222222-2222-4222-8222-222222222222";
  const { token } = await createAccessToken({ userId: ownerId, role: "OWNER", email: "owner@example.com" });
  const customer = await createAccessToken({ userId: ownerId, role: "CUSTOMER", email: "customer@example.com" });
  const request = (bearer?: string) => new Request("http://localhost/api/owner/bookings/confirm", { method: "POST", headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify({ bookingId }) });
  assert.equal((await POST(request())).status, 401);
  assert.equal((await POST(request(customer.token))).status, 403);
  let found = false;
  let amount = 0;
  let confirmedAt: Date | null = null;
  let writes = 0;
  const notifications = new Set<string>();
  const tx = {
    booking: {
      findFirst: async ({ where }: { where: { court: { ownerId: string } } }) => {
        assert.equal(where.court.ownerId, ownerId);
        return found ? { id: bookingId, userId: ownerId, status: "PAID", totalAmount: 90000, confirmedAt, payments: [{ amount }], court: { name: "Test court" } } : null;
      },
      update: async () => { confirmedAt = new Date(); writes++; },
    },
    notification: { upsert: async ({ create }: { create: { kind: string } }) => { notifications.add(create.kind); } },
  };
  const original = prisma.$transaction;
  prisma.$transaction = (async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)) as unknown as typeof original;
  try {
    assert.equal((await POST(request(token))).status, 404);
    found = true;
    assert.equal((await POST(request(token))).status, 409);
    amount = 90000;
    assert.equal((await POST(request(token))).status, 200);
    assert.equal((await POST(request(token))).status, 200);
    assert.equal(writes, 1);
    assert.equal(notifications.size, 1);
    assert.ok(notifications.has("BOOKING_CONFIRMED"));
  } finally { prisma.$transaction = original; }
});
