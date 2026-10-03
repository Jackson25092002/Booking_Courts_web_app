import assert from "node:assert/strict";
import test from "node:test";
import { customerToken, userId, courtId, stub } from "./test-support";
import prisma from "./prisma";
import { GET } from "../app/api/bookings/[id]/receipt/route";

async function request(id = courtId, authenticated = true) {
  return GET(new Request(`https://backend.example.com/api/bookings/${id}/receipt`, {
    headers: authenticated ? { Authorization: `Bearer ${await customerToken()}` } : {},
  }), { params: Promise.resolve({ id }) });
}

test("receipt requires login and validates ID before database access", async (t) => {
  const query = stub(t, prisma.booking, "findFirst", async () => { throw new Error("Must not query"); });
  assert.equal((await request(courtId, false)).status, 401);
  assert.equal((await request("invalid")).status, 400);
  assert.equal(query.mock.callCount(), 0);
});

test("receipt hides another customer's booking and excludes passwords/payment URLs", async (t) => {
  stub(t, prisma.booking, "findFirst", async ({ where, select }: { where: unknown; select: { user: { select: object }; payments: { select: object } } }) => {
    assert.deepEqual(where, { id: courtId, userId });
    assert.equal("passwordHash" in select.user.select, false);
    assert.equal("paymentUrl" in select.payments.select, false);
    return null;
  });
  assert.equal((await request()).status, 404);
});

test("receipt returns stored slot prices and successful payment evidence", async (t) => {
  const paid = { status: "SUCCEEDED", amount: 90000, txnRef: "paid", paidAt: "2026-10-03T02:00:00Z" };
  const booking = { id: courtId, status: "PAID", confirmedAt: null, totalAmount: 90000,
    slots: [{ price: 90000 }], payments: [{ status: "FAILED", amount: 90000, txnRef: "failed" }, paid],
  };
  stub(t, prisma.booking, "findFirst", async () => booking);
  const response = await request();
  assert.equal(response.status, 200);
  const result = (await response.json()).data.booking;
  assert.deepEqual(result.payment, paid);
  assert.equal(result.totalAmount, 90000);
  assert.equal(result.slots[0].price, 90000);
  assert.equal(result.confirmedAt, null);
  assert.equal("payments" in result, false);
});

test("unpaid receipt preserves WAITING or absence of payment without claiming success", async (t) => {
  let payments: object[] = [{ status: "WAITING", amount: 90000 }];
  stub(t, prisma.booking, "findFirst", async () => ({ id: courtId, status: "PENDING", payments }));
  assert.equal((await (await request()).json()).data.booking.payment.status, "WAITING");
  payments = [];
  assert.equal((await (await request()).json()).data.booking.payment, null);
});
