import type { TestContext } from "node:test";
// Imported only by tests. Never load .env or connect to a real database.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/isolated_test";
process.env.JWT_SECRET = "unit-test-secret-not-a-real-credential";
process.env.FRONTEND_URL = "https://frontend.example.com";
process.env.VNPAY_TMN_CODE = "TESTCODE";
process.env.VNPAY_HASH_SECRET = "unit-test-payment-secret";
process.env.VNPAY_RETURN_URL = "https://backend.example.com/api/payments/vnpay/return";
process.env.VNPAY_PAYMENT_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

export const userId = "11111111-1111-4111-8111-111111111111";
export const courtId = "22222222-2222-4222-8222-222222222222";
export const fieldId = "33333333-3333-4333-8333-333333333333";
export const secondFieldId = "44444444-4444-4444-8444-444444444444";
export function post(path: string, body: unknown, token?: string) {
  return new Request(`https://backend.example.com${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}
export function invalidJson(path: string, token?: string) {
  return new Request(`https://backend.example.com${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: "{",
  });
}
export async function customerToken() {
  const { createAccessToken } = await import("./auth");
  return (await createAccessToken({ userId, email: "test@example.com", role: "CUSTOMER" })).token;
}
export function futureDate(time: string) {
  const day = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  return `${day}T${time}:00+07:00`;
}

// Prisma exposes delegates through a Proxy, not ordinary method descriptors.
// Assign a tracked stub and restore it after each test rather than mock.method.
export function stub(t: TestContext, target: object, key: string, implementation: unknown) {
  const object = target as Record<string, unknown>;
  const original = object[key];
  const fn = t.mock.fn(implementation as (...args: unknown[]) => unknown);
  object[key] = fn;
  t.after(() => { object[key] = original; });
  return fn;
}
