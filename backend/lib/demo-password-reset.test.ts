import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { stub, userId } from "./test-support";
import { POST } from "../app/api/auth/demo-reset-password/route";
import prisma from "./prisma";
import { verifyPassword } from "./auth";

function environment(t: TestContext, mode = "development", vercel?: string) {
  const previous = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL };
  Object.assign(process.env, { NODE_ENV: mode });
  if (vercel) process.env.VERCEL = vercel; else delete process.env.VERCEL;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}
function request(origin = "http://localhost:5173", overrides = {}, url = "http://localhost:3000/api/auth/demo-reset-password") {
  return new Request(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email: " TEST@EXAMPLE.COM ", password: "NewPass@123", confirmPassword: "NewPass@123", ...overrides }) });
}

test("demo reset saves hashed password without sending email", async (t) => {
  environment(t);
  stub(t, prisma.user, "findUnique", async ({ where }: { where: { email: string } }) => {
    assert.equal(where.email, "test@example.com"); return { id: userId };
  });
  const writes = stub(t, prisma.user, "update", async ({ data }: { data: { passwordHash: string } }) => {
    assert.equal(await verifyPassword("NewPass@123", data.passwordHash), true); return { id: userId };
  });
  const sends = t.mock.method(globalThis, "fetch", async () => { throw new Error("Must not send email"); });
  assert.equal((await POST(request())).status, 200);
  assert.equal(writes.mock.callCount(), 1);
  assert.equal(sends.mock.callCount(), 0);
});

test("demo reset blocks production, Vercel, remote host and remote or missing origin", async (t) => {
  environment(t);
  const reads = stub(t, prisma.user, "findUnique", async () => { throw new Error("Must not access DB"); });
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal((await POST(request())).status, 403);
  Object.assign(process.env, { NODE_ENV: "development", VERCEL: "1" });
  assert.equal((await POST(request())).status, 403);
  delete process.env.VERCEL;
  assert.equal((await POST(request("https://example.com"))).status, 403);
  assert.equal((await POST(request(""))).status, 403);
  assert.equal((await POST(request("http://localhost:5173", {}, "https://example.com/api/auth/demo-reset-password"))).status, 403);
  assert.equal(reads.mock.callCount(), 0);
});

test("demo reset rejects invalid email, short password and mismatched confirmation", async (t) => {
  environment(t);
  const reads = stub(t, prisma.user, "findUnique", async () => null);
  for (const input of [{ email: "invalid" }, { password: "123", confirmPassword: "123" }, { confirmPassword: "different" }]) {
    assert.equal((await POST(request(undefined, input))).status, 400);
  }
  assert.equal(reads.mock.callCount(), 0);
});

test("demo reset reports unknown email without creating an account", async (t) => {
  environment(t);
  stub(t, prisma.user, "findUnique", async () => null);
  const writes = stub(t, prisma.user, "update", async () => ({}));
  assert.equal((await POST(request())).status, 404);
  assert.equal(writes.mock.callCount(), 0);
});
