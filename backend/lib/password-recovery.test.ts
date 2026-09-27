import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import { post, invalidJson, userId, stub } from "./test-support";
import { forgotPasswordSchema, resetPasswordSchema } from "./validators/auth";

test("RESET-01: validate email, missing token and password length", () => {
  assert.equal(forgotPasswordSchema.parse({ email: " TEST@EXAMPLE.COM " }).email, "test@example.com");
  assert.equal(forgotPasswordSchema.safeParse({ email: "invalid" }).success, false);
  for (const input of [{ token: "", password: "Demo@123" }, { token: "x", password: "123" }, { token: "x", password: "x".repeat(73) }]) {
    assert.equal(resetPasswordSchema.safeParse(input).success, false);
  }
});
test("RESET-02: reset JWT valid, invalidated by password change; access JWT cannot reset", async () => {
  const { createPasswordResetToken, verifyPasswordResetToken, isPasswordResetTokenCurrent, createAccessToken } = await import("./auth");
  const token = await createPasswordResetToken({ userId, email: "test@example.com", passwordHash: "old-hash" });
  const payload = await verifyPasswordResetToken(token);
  assert.equal(payload?.userId, userId);
  assert.equal(isPasswordResetTokenCurrent("old-hash", payload!.passwordFingerprint), true);
  assert.equal(isPasswordResetTokenCurrent("new-hash", payload!.passwordFingerprint), false);
  assert.equal(await verifyPasswordResetToken("malformed"), null);
  assert.equal(await verifyPasswordResetToken(token + "tampered"), null);
  const access = await createAccessToken({ userId, email: "test@example.com", role: "CUSTOMER" });
  assert.equal(await verifyPasswordResetToken(access.token), null);
});
test("RESET-03: expired token rejected", async () => {
  const { verifyPasswordResetToken } = await import("./auth");
  const token = await new SignJWT({ purpose: "password-reset", email: "test@example.com", passwordFingerprint: "test" })
    .setProtectedHeader({ alg: "HS256" }).setSubject(userId).setAudience("password-reset")
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(process.env.JWT_SECRET!));
  assert.equal(await verifyPasswordResetToken(token), null);
  const { POST } = await import("../app/api/auth/reset-password/route");
  assert.equal((await POST(post("/api/auth/reset-password", { token, password: "NewPass@123" }))).status, 400);
});
for (const action of ["forgot-password", "reset-password"]) test(`RESET-04/${action}: invalid JSON and fields rejected`, async () => {
  const { POST } = await import(`../app/api/auth/${action}/route`);
  assert.equal((await POST(invalidJson(`/api/auth/${action}`))).status, 400);
  assert.equal((await POST(post(`/api/auth/${action}`, {}))).status, 400);
});
test("RESET-05: known and unknown email return same generic response; mocked email has valid link", async (t) => {
  const { POST } = await import("../app/api/auth/forgot-password/route");
  const { default: prisma } = await import("./prisma");
  const { verifyPasswordResetToken } = await import("./auth");
  let known = false;
  process.env.RESEND_API_KEY = "mock-key-not-real";
  stub(t, prisma.user, "findUnique", async () => known ? { id: userId, email: "test@example.com", fullName: "Test", passwordHash: "old-hash" } : null);
  const email = t.mock.method(globalThis, "fetch", async (url: string, options: { body: string }) => {
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, ["test@example.com"]);
    const link = /href="([^"]+)"/.exec(body.html)![1];
    const target = new URL(link);
    assert.equal(target.origin, "https://frontend.example.com"); assert.equal(target.pathname, "/reset-password");
    assert.equal((await verifyPasswordResetToken(target.searchParams.get("token")!))?.userId, userId);
    return Response.json({ id: "mock-email" });
  });
  const absent = await POST(post("/api/auth/forgot-password", { email: "test@example.com" }));
  assert.equal(absent.status, 200); assert.equal(email.mock.callCount(), 0);
  known = true;
  const present = await POST(post("/api/auth/forgot-password", { email: "test@example.com" }));
  assert.equal(present.status, 200); assert.deepEqual(await present.json(), await absent.json());
  assert.equal(email.mock.callCount(), 1);
});
test("RESET-06: email provider failure gives 503 and no token in public response", async (t) => {
  const { POST } = await import("../app/api/auth/forgot-password/route");
  const { default: prisma } = await import("./prisma");
  process.env.RESEND_API_KEY = "mock-key";
  stub(t, prisma.user, "findUnique", async () => ({ id: userId, email: "test@example.com", fullName: "Test", passwordHash: "hash" }));
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  t.mock.method(console, "error", () => {});
  const response = await POST(post("/api/auth/forgot-password", { email: "test@example.com" }));
  assert.equal(response.status, 503); assert.equal((await response.json()).token, undefined);
});
test("RESET-07: valid token updates hash once and rejects reuse", async (t) => {
  const { POST } = await import("../app/api/auth/reset-password/route");
  const { default: prisma } = await import("./prisma");
  const { createPasswordResetToken, verifyPassword } = await import("./auth");
  let hash = "old-hash";
  const token = await createPasswordResetToken({ userId, email: "test@example.com", passwordHash: hash });
  stub(t, prisma.user, "findUnique", async () => ({ id: userId, email: "test@example.com", passwordHash: hash }));
  const writes = stub(t, prisma.user, "updateMany", async ({ where, data }: { where: { id: string; passwordHash: string }; data: { passwordHash: string } }) => {
    assert.equal(where.id, userId); assert.equal(where.passwordHash, hash);
    hash = data.passwordHash; return { count: 1 };
  });
  assert.equal((await POST(post("/api/auth/reset-password", { token, password: "NewPass@123" }))).status, 200);
  assert.equal(await verifyPassword("NewPass@123", hash), true);
  assert.equal((await POST(post("/api/auth/reset-password", { token, password: "AgainPass@123" }))).status, 400);
  assert.equal(writes.mock.callCount(), 1);
});
for (const scenario of ["unknownUser", "differentEmail", "changedPassword", "concurrentReset"]) test(`RESET-08/${scenario}: reject reset safely`, async (t) => {
  const { POST } = await import("../app/api/auth/reset-password/route");
  const { default: prisma } = await import("./prisma");
  const { createPasswordResetToken } = await import("./auth");
  const token = await createPasswordResetToken({ userId, email: "test@example.com", passwordHash: "old-hash" });
  stub(t, prisma.user, "findUnique", async () => scenario === "unknownUser" ? null : { id: userId,
    email: scenario === "differentEmail" ? "other@example.com" : "test@example.com",
    passwordHash: scenario === "changedPassword" ? "changed-hash" : "old-hash" });
  const writes = stub(t, prisma.user, "updateMany", async () => ({ count: 0 }));
  assert.equal((await POST(post("/api/auth/reset-password", { token, password: "NewPass@123" }))).status, scenario === "concurrentReset" ? 409 : 400);
  assert.equal(writes.mock.callCount(), scenario === "concurrentReset" ? 1 : 0);
});
