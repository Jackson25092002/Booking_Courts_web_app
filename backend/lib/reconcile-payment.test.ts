import assert from "node:assert/strict";
import test from "node:test";
import { VNPay } from "vnpay";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.VNPAY_TMN_CODE = "TESTCODE";
process.env.VNPAY_HASH_SECRET = "test-only-secret";
process.env.VNPAY_RETURN_URL = "http://localhost/return";
test("reconciliation rejects unsigned, mismatched and non-successful responses", async () => {
  const { default: prisma } = await import("./prisma");
  const { reconcilePayment } = await import("./reconcile-payment");
  const payment = { status: "WAITING", txnRef: "a".repeat(32), amount: 90000, paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_CreateDate=20260927120000", bookingId: "booking", id: "payment", booking: { status: "PENDING", totalAmount: 90000, court: { ownerId: "owner", name: "Test" } } };
  const originalFind = prisma.payment.findUniqueOrThrow;
  const originalQuery = VNPay.prototype.queryDr;
  const originalTx = prisma.$transaction;
  let writes = 0;
  let notices = 0;
  let result = { isVerified: true, vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionType: "01", vnp_TxnRef: payment.txnRef, vnp_Amount: 9000000, vnp_SecureHash: "", vnp_TransactionNo: "123", vnp_BankCode: "NCB" };
  prisma.payment.findUniqueOrThrow = (async () => payment) as unknown as typeof originalFind;
  VNPay.prototype.queryDr = (async () => result) as unknown as typeof originalQuery;
  const tx = { payment: { findUniqueOrThrow: async () => payment, update: async () => { writes++; } }, booking: { update: async () => ({}) }, notification: { upsert: async () => { notices++; } } };
  prisma.$transaction = (async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)) as unknown as typeof originalTx;
  try {
    assert.equal((await reconcilePayment(payment.txnRef)).settled, false);
    result = { ...result, vnp_SecureHash: "a".repeat(128), isVerified: false };
    assert.equal((await reconcilePayment(payment.txnRef)).settled, false);
    result = { ...result, isVerified: true, vnp_Amount: 1 };
    await assert.rejects(() => reconcilePayment(payment.txnRef), /mismatch/);
    result = { ...result, vnp_Amount: 9000000, vnp_TransactionStatus: "01" };
    assert.equal((await reconcilePayment(payment.txnRef)).settled, false);
    assert.equal(writes, 0);
    result = { ...result, vnp_TransactionStatus: "00" };
    assert.equal((await reconcilePayment(payment.txnRef)).settled, true);
    assert.equal(writes, 1); assert.equal(notices, 1);
  } finally { prisma.payment.findUniqueOrThrow = originalFind; prisma.$transaction = originalTx; VNPay.prototype.queryDr = originalQuery; }
});
