import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getVNPay, vnpayDate, verifyVNPayQuery, isSuccessfulPayment } from "./vnpay";

process.env.VNPAY_TMN_CODE = "TESTCODE";
process.env.VNPAY_HASH_SECRET = "test-only-secret-not-a-real-credential";
process.env.VNPAY_RETURN_URL = "http://localhost:3000/api/payments/vnpay/return";
process.env.VNPAY_PAYMENT_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

function signedQuery(overrides: Record<string, string> = {}) {
  const data = { vnp_TmnCode: "TESTCODE", vnp_TxnRef: "a".repeat(32), vnp_Amount: "9000000", vnp_OrderInfo: "Thanh toan dat san", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: "12345", ...overrides };
  const query = new URLSearchParams(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  query.set("vnp_SecureHash", createHmac("sha512", process.env.VNPAY_HASH_SECRET!).update(query.toString()).digest("hex"));
  return query;
}

test("VNPay dates always use GMT+7", () => {
  assert.equal(vnpayDate(new Date("2026-09-27T18:30:00Z")), 20260928013000);
});
test("SDK scales VND exactly once", () => {
  const url = getVNPay().client.buildPaymentUrl({ vnp_Amount: 90000, vnp_TxnRef: "test", vnp_OrderInfo: "Dat san", vnp_ReturnUrl: process.env.VNPAY_RETURN_URL!, vnp_IpAddr: "127.0.0.1" });
  assert.equal(new URL(url).searchParams.get("vnp_Amount"), "9000000");
});
test("signed Return and IPN are verified and normalized to VND", () => {
  assert.equal(verifyVNPayQuery(signedQuery())?.vnp_Amount, 90000);
  assert.equal(verifyVNPayQuery(signedQuery(), true)?.isVerified, true);
});
test("reject changed amount, merchant, duplicated fields and missing hash", () => {
  for (const [field, value] of [["vnp_Amount", "100"], ["vnp_TmnCode", "OTHER"], ["vnp_SecureHash", ""]]) {
    const query = signedQuery(); query.set(field, value);
    assert.equal(verifyVNPayQuery(query), null);
  }
  const duplicate = signedQuery(); duplicate.append("vnp_Amount", "9000000");
  assert.equal(verifyVNPayQuery(duplicate), null);
});
test("success requires both response and transaction status 00", () => {
  assert.equal(isSuccessfulPayment({ vnp_ResponseCode: "00", vnp_TransactionStatus: "00" }), true);
  assert.equal(isSuccessfulPayment({ vnp_ResponseCode: "00", vnp_TransactionStatus: "02" }), false);
  assert.equal(isSuccessfulPayment({ vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }), false);
  assert.equal(isSuccessfulPayment({ vnp_ResponseCode: "00" }), false);
});

test("IPN updates booking only once, rejects unknown orders and wrong amounts", async () => {
  // No real database writes: exercise the route with an isolated transaction stub.
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  const { default: prisma } = await import("./prisma");
  const { GET } = await import("../app/api/payments/vnpay/ipn/route");
  let amount = 90000;
  let status = "WAITING";
  let found = true;
  let bookingWrites = 0;
  let notificationWrites = 0;
  const tx = {
    payment: {
      findUnique: async () => found ? { id: "payment", bookingId: "booking", amount, status, booking: { totalAmount: amount, status: "PENDING" } } : null,
      update: async ({ data }: { data: { status: string } }) => { status = data.status; },
    },
    booking: { update: async () => { bookingWrites++; } },
    court: { findUniqueOrThrow: async () => ({ ownerId: "owner", name: "Test court" }) },
    notification: { upsert: async () => { notificationWrites++; } },
  };
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = (async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) as unknown as typeof prisma.$transaction;
  async function call(query = signedQuery()) {
    return (await GET(new Request(`http://localhost/api/payments/vnpay/ipn?${query}`))).json();
  }
  try {
    assert.equal((await call()).RspCode, "00");
    assert.equal(status, "SUCCEEDED");
    assert.equal(bookingWrites, 1);
    assert.equal(notificationWrites, 1);
    assert.equal((await call()).RspCode, "02");
    assert.equal(notificationWrites, 1);
    assert.equal(bookingWrites, 1);
    status = "WAITING"; amount = 1;
    assert.equal((await call()).RspCode, "04");
    assert.equal(bookingWrites, 1);
    found = false;
    assert.equal((await call()).RspCode, "01");
    const invalid = signedQuery(); invalid.set("vnp_Amount", "1");
    assert.equal((await call(invalid)).RspCode, "97");
    found = true; amount = 90000;
    assert.equal((await call(signedQuery({ vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }))).RspCode, "00");
    assert.equal(status, "FAILED");
    assert.equal(bookingWrites, 1);
    for (const code of ["51", "12", "09", "99", "11"]) {
      status = "WAITING";
      assert.equal((await call(signedQuery({ vnp_ResponseCode: code, vnp_TransactionStatus: "02" }))).RspCode, "00");
      assert.equal(status, "FAILED");
      assert.equal(bookingWrites, 1, `Failure ${code} must not mark booking PAID`);
      assert.equal((await call(signedQuery({ vnp_ResponseCode: code, vnp_TransactionStatus: "02" }))).RspCode, "02");
    }
  } finally { prisma.$transaction = originalTransaction; }
});

test("create payment requires login and validates bookingId before database access", async () => {
  process.env.JWT_SECRET = "test-only-jwt-secret-long-enough";
  const { POST } = await import("../app/api/payments/vnpay/route");
  const { createAccessToken } = await import("./auth");
  assert.equal((await POST(new Request("http://localhost/api/payments/vnpay", { method: "POST" }))).status, 401);
  const { token } = await createAccessToken({ userId: "11111111-1111-4111-8111-111111111111", email: "test@example.com", role: "CUSTOMER" });
  const invalid = new Request("http://localhost/api/payments/vnpay", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: "invalid", amount: 1 }) });
  assert.equal((await POST(invalid)).status, 400);
});

test("signed Return redirects only, never settles a payment", async () => {
  const { GET } = await import("../app/api/payments/vnpay/return/route");
  const { default: prisma } = await import("./prisma");
  const originalTransaction = prisma.$transaction;
  const originalOrigin = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = "https://frontend.example.com";
  prisma.$transaction = (() => { throw new Error("Return must never write transactions"); }) as unknown as typeof prisma.$transaction;
  try {
    const response = await GET(new Request(`https://backend.example.com/api/payments/vnpay/return?${signedQuery()}`));
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get("location")!);
    assert.equal(location.origin, process.env.FRONTEND_URL);
    assert.equal(location.searchParams.get("txnRef"), "a".repeat(32));
    const invalid = await GET(new Request("https://backend.example.com/api/payments/vnpay/return"));
    assert.equal(new URL(invalid.headers.get("location")!).searchParams.get("error"), "invalid-signature");
  } finally {
    prisma.$transaction = originalTransaction;
    if (originalOrigin === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalOrigin;
  }
});
