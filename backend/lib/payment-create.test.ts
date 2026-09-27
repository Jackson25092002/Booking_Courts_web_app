import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { post, invalidJson, customerToken, userId, courtId, stub } from "./test-support";

async function setup(t: TestContext, options: { missing?: boolean; status?: string; amount?: number; past?: boolean; noSlots?: boolean; review?: boolean; waiting?: boolean; expired?: boolean; conflict?: boolean } = {}) {
  const { default: prisma } = await import("./prisma");
  const { POST } = await import("../app/api/payments/vnpay/route");
  const token = await customerToken();
  const waitingPayment = { txnRef: "a".repeat(32), paymentUrl: "https://sandbox.example.com/existing", expiresAt: new Date(Date.now() + (options.expired ? -1 : 60000)) };
  const create = t.mock.fn(async ({ data }: { data: Record<string, unknown> }) => data);
  const transaction = stub(t, prisma, "$transaction", async (callback: (tx: unknown) => Promise<unknown>, isolation: { isolationLevel: string }) => {
    assert.equal(isolation.isolationLevel, "Serializable");
    if (options.conflict) throw { code: "P2034" };
    return callback({
      booking: { findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        assert.equal(where.userId, userId); assert.equal(where.id, courtId);
        return options.missing ? null : { id: courtId, status: options.status || "PENDING", totalAmount: options.amount ?? 90000,
          slots: options.noSlots ? [] : [{ startsAt: new Date(Date.now() + (options.past ? -1000 : 3600000)) }] };
      } },
      payment: { findFirst: async ({ where }: { where: { responseCode?: string } }) => where.responseCode === "07" ? (options.review ? { id: "review" } : null) : options.waiting ? waitingPayment : null, create },
    });
  });
  return { POST, token, create, transaction, waitingPayment };
}
test("PAY-01: require login and reject malformed/injected amount before DB access", async (t) => {
  const s = await setup(t);
  assert.equal((await s.POST(post("/api/payments/vnpay", {}))).status, 401);
  assert.equal((await s.POST(invalidJson("/api/payments/vnpay", s.token))).status, 400);
  for (const input of [{ bookingId: "invalid" }, { bookingId: courtId, amount: 1 }]) {
    assert.equal((await s.POST(post("/api/payments/vnpay", input, s.token))).status, 400);
  }
  assert.equal(s.transaction.mock.callCount(), 0);
});
test("PAY-02: create payment from DB amount, scale exactly once and expire within 15 minutes", async (t) => {
  const s = await setup(t);
  const before = Date.now();
  const response = await s.POST(post("/api/payments/vnpay", { bookingId: courtId }, s.token));
  assert.equal(response.status, 201);
  const { data } = await response.json();
  const url = new URL(data.paymentUrl);
  assert.equal(url.hostname, "sandbox.vnpayment.vn"); assert.equal(url.searchParams.get("vnp_Amount"), "9000000");
  assert.equal(url.searchParams.get("vnp_ReturnUrl"), process.env.VNPAY_RETURN_URL);
  assert.match(data.txnRef, /^[a-f0-9]{32}$/);
  assert.ok(new Date(data.expiresAt).getTime() >= before + 14 * 60000);
  assert.ok(new Date(data.expiresAt).getTime() <= Date.now() + 15 * 60000);
  assert.equal(s.create.mock.callCount(), 1);
});
test("PAY-03: reuse live waiting link without charging another attempt", async (t) => {
  const s = await setup(t, { waiting: true });
  const response = await s.POST(post("/api/payments/vnpay", { bookingId: courtId }, s.token));
  assert.equal(response.status, 201); assert.equal((await response.json()).data.txnRef, s.waitingPayment.txnRef);
  assert.equal(s.create.mock.callCount(), 0);
});
const rejected = [
  { name: "notOwnedOrMissing", options: { missing: true }, status: 404 },
  { name: "alreadyPaid", options: { status: "PAID" }, status: 409 },
  { name: "cancelled", options: { status: "CANCELLED" }, status: 409 },
  { name: "suspectedDebit07", options: { review: true }, status: 409 },
  { name: "unresolvedExpired", options: { waiting: true, expired: true }, status: 409 },
  { name: "past", options: { past: true }, status: 400 },
  { name: "emptySlots", options: { noSlots: true }, status: 400 },
  { name: "zeroAmount", options: { amount: 0 }, status: 400 },
  { name: "negativeAmount", options: { amount: -1 }, status: 400 },
  { name: "concurrentRequest", options: { conflict: true }, status: 409 },
];
for (const item of rejected) test(`PAY-04/${item.name}: no new payment created`, async (t) => {
  const s = await setup(t, item.options);
  assert.equal((await s.POST(post("/api/payments/vnpay", { bookingId: courtId }, s.token))).status, item.status);
  assert.equal(s.create.mock.callCount(), 0);
});
test("PAY-05: missing gateway settings return 503 without DB access", async (t) => {
  const s = await setup(t);
  const old = process.env.VNPAY_HASH_SECRET;
  delete process.env.VNPAY_HASH_SECRET;
  try {
    assert.equal((await s.POST(post("/api/payments/vnpay", { bookingId: courtId }, s.token))).status, 503);
    assert.equal(s.transaction.mock.callCount(), 0);
  } finally { process.env.VNPAY_HASH_SECRET = old; }
});
