import assert from "node:assert/strict";
import test from "node:test";
import { VNPay } from "vnpay";
import { customerToken, post, stub, userId, courtId } from "./test-support";
import prisma from "./prisma";
import { reconcilePaymentThrottled } from "./reconcile-payment";
import { POST } from "../app/api/payments/vnpay/reconcile/route";
import { GET as ownerBookings } from "../app/api/owner/bookings/route";
import { GET as notifications } from "../app/api/notifications/route";
import { createAccessToken } from "./auth";

const txnRef = "a".repeat(32);
function waiting() {
  const createdAt = new Date(Date.now() - 60000);
  return { id: "payment", bookingId: courtId, txnRef, status: "WAITING", amount: 90000,
    createdAt, updatedAt: createdAt,
    paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_CreateDate=20261003090000",
    booking: { status: "PENDING", totalAmount: 90000, court: { ownerId: "actual-court-owner", name: "Test court" } },
  };
}

test("automatic verification settles payment, booking and notification for the actual court owner", async (t) => {
  const payment = waiting();
  stub(t, prisma.payment, "findUniqueOrThrow", async () => payment);
  stub(t, prisma.payment, "updateMany", async () => ({ count: 1 }));
  const query = stub(t, VNPay.prototype, "queryDr", async () => ({ isVerified: true,
    vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionType: "01",
    vnp_TxnRef: txnRef, vnp_Amount: 9000000, vnp_SecureHash: "a".repeat(128),
  }));
  const writes: string[] = [];
  stub(t, prisma, "$transaction", async (fn: (tx: unknown) => unknown) => fn({
    payment: { findUniqueOrThrow: async () => payment, update: async ({ data }: { data: { status: string } }) => {
      assert.equal(data.status, "SUCCEEDED"); writes.push("payment");
    } },
    booking: { update: async ({ data }: { data: { status: string } }) => {
      assert.equal(data.status, "PAID"); writes.push("booking");
    } },
    notification: { upsert: async ({ create, where }: { create: { userId: string; bookingId: string; kind: string }; where: { userId_bookingId_kind: unknown } }) => {
      assert.equal(create.userId, "actual-court-owner");
      assert.equal(create.bookingId, courtId); assert.equal(create.kind, "BOOKING_PAID");
      assert.deepEqual(where.userId_bookingId_kind, { userId: create.userId, bookingId: courtId, kind: "BOOKING_PAID" });
      writes.push("notification");
    } },
  }));
  const result = await reconcilePaymentThrottled(txnRef);
  assert.equal(result.settled, true);
  assert.equal(query.mock.callCount(), 1);
  assert.deepEqual(writes, ["payment", "booking", "notification"]);
});

test("recent query and lost concurrent claim do not query the gateway again", async (t) => {
  let payment = { ...waiting(), updatedAt: new Date() };
  stub(t, prisma.payment, "findUniqueOrThrow", async () => payment);
  const claim = stub(t, prisma.payment, "updateMany", async () => ({ count: 0 }));
  const query = stub(t, VNPay.prototype, "queryDr", async () => { throw new Error("Must not query"); });
  assert.equal((await reconcilePaymentThrottled(txnRef)).settled, false);
  assert.equal(claim.mock.callCount(), 0);
  payment = waiting();
  assert.equal((await reconcilePaymentThrottled(txnRef)).settled, false);
  assert.equal(claim.mock.callCount(), 1);
  assert.equal(query.mock.callCount(), 0);
});

test("already succeeded does not send another query or notification", async (t) => {
  stub(t, prisma.payment, "findUniqueOrThrow", async () => ({ ...waiting(), status: "SUCCEEDED" }));
  const query = stub(t, VNPay.prototype, "queryDr", async () => { throw new Error("Must not query"); });
  assert.equal((await reconcilePaymentThrottled(txnRef)).settled, true);
  assert.equal(query.mock.callCount(), 0);
});

test("reconcile requires login and ownership before gateway access", async (t) => {
  const query = stub(t, VNPay.prototype, "queryDr", async () => { throw new Error("Must not query"); });
  assert.equal((await POST(post("/api/payments/vnpay/reconcile", { txnRef }))).status, 401);
  stub(t, prisma.payment, "findFirst", async ({ where }: { where: { booking: { userId: string } } }) => {
    assert.equal(where.booking.userId, userId); return null;
  });
  assert.equal((await POST(post("/api/payments/vnpay/reconcile", { txnRef }, await customerToken()))).status, 404);
  assert.equal(query.mock.callCount(), 0);
});

test("owner pending list and notifications are scoped to logged-in owner", async (t) => {
  stub(t, prisma.match, "findMany", async () => []);
  const { token } = await createAccessToken({ userId, email: "owner@example.com", role: "OWNER" });
  const request = (path: string) => new Request(`https://backend.example.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  stub(t, prisma.booking, "findMany", async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { court: { ownerId: userId }, status: "PAID", confirmedAt: null, payments: { some: { status: "SUCCEEDED" } } });
    return [{ id: courtId }];
  });
  stub(t, prisma.notification, "findMany", async ({ where }: { where: { userId: string } }) => {
    assert.equal(where.userId, userId); return [{ id: "notice", kind: "BOOKING_PAID" }];
  });
  stub(t, prisma.notification, "count", async ({ where }: { where: { userId: string; readAt: unknown } }) => {
    assert.deepEqual(where, { userId, readAt: null }); return 1;
  });
  assert.equal((await (await ownerBookings(request("/api/owner/bookings"))).json()).data.bookings.length, 1);
  assert.equal((await (await notifications(request("/api/notifications"))).json()).data.unreadCount, 1);
  assert.equal((await ownerBookings(new Request("https://backend.example.com/api/owner/bookings", { headers: { Authorization: `Bearer ${await customerToken()}` } }))).status, 403);
});
