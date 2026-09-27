import assert from "node:assert/strict";
import test from "node:test";
import { post, invalidJson, userId, stub } from "./test-support";
import { registerSchema, loginSchema } from "./validators/auth";

const registration = { fullName: " Test User ", email: " TEST@EXAMPLE.COM ", phone: "0900000002", password: "Demo@123" };

test("REG-01: normalize name/email and accept a valid phone", () => {
  const input = registerSchema.parse(registration);
  assert.equal(input.fullName, "Test User");
  assert.equal(input.email, "test@example.com");
  assert.equal(registerSchema.safeParse({ ...registration, phone: "+84900000002" }).success, true);
});
for (const [name, input] of Object.entries({
  missingPhone: { ...registration, phone: undefined }, invalidPhone: { ...registration, phone: "123" },
  invalidEmail: { ...registration, email: "invalid" }, shortName: { ...registration, fullName: "A" },
  shortPassword: { ...registration, password: "1234567" }, longPassword: { ...registration, password: "a".repeat(73) },
})) test(`REG-02/${name}: reject invalid registration`, () => assert.equal(registerSchema.safeParse(input).success, false));

test("REG-03: create CUSTOMER with hashed password, ignore injected role", async (t) => {
  const { POST } = await import("../app/api/auth/register/route");
  const { default: prisma } = await import("./prisma");
  const { verifyPassword } = await import("./auth");
  stub(t, prisma.user, "findFirst", async () => null);
  const create = stub(t, prisma.user, "create", async ({ data }: { data: Record<string, string> }) => {
    assert.equal(data.role, "CUSTOMER"); assert.equal(data.email, "test@example.com");
    assert.notEqual(data.passwordHash, registration.password);
    assert.equal(await verifyPassword(registration.password, data.passwordHash), true);
    assert.equal("password" in data, false);
    return { id: userId, fullName: data.fullName, email: data.email, phone: data.phone, role: data.role };
  });
  const response = await POST(post("/api/auth/register", { ...registration, role: "ADMIN" }));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.success, true); assert.equal(result.data.user.role, "CUSTOMER");
  assert.equal("passwordHash" in result.data.user, false); assert.equal(create.mock.callCount(), 1);
});
for (const field of ["email", "phone"]) test(`REG-04/${field}: reject duplicate without creating user`, async (t) => {
  const { POST } = await import("../app/api/auth/register/route");
  const { default: prisma } = await import("./prisma");
  stub(t, prisma.user, "findFirst", async () => ({ email: field === "email" ? "test@example.com" : "other@example.com", phone: registration.phone }));
  const create = stub(t, prisma.user, "create", async () => { throw new Error("Unexpected write"); });
  const response = await POST(post("/api/auth/register", registration));
  assert.equal(response.status, 409); assert.ok((await response.json()).errors[field]);
  assert.equal(create.mock.callCount(), 0);
});
test("REG-05: concurrent duplicate P2002 returns 409", async (t) => {
  const { POST } = await import("../app/api/auth/register/route");
  const { default: prisma } = await import("./prisma");
  stub(t, prisma.user, "findFirst", async () => null);
  stub(t, prisma.user, "create", async () => { throw { code: "P2002" }; });
  assert.equal((await POST(post("/api/auth/register", registration))).status, 409);
});
for (const action of ["register", "login"] as const) test(`AUTH-01/${action}: malformed or missing input returns 400 without DB access`, async (t) => {
  const { POST } = await import(`../app/api/auth/${action}/route`);
  const { default: prisma } = await import("./prisma");
  const query = stub(t, prisma.user, "findFirst", async () => { throw new Error("Unexpected DB access"); });
  assert.equal((await POST(invalidJson(`/api/auth/${action}`))).status, 400);
  assert.equal((await POST(post(`/api/auth/${action}`, {}))).status, 400);
  assert.equal(query.mock.callCount(), 0);
});
test("LOGIN-01: empty credentials rejected", () => {
  assert.equal(loginSchema.safeParse({ identifier: " ", password: "x" }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: "test@example.com", password: "" }).success, false);
});
for (const identifier of [" TEST@EXAMPLE.COM ", "0900000002"]) test(`LOGIN-02/${identifier.trim()}: issue valid JWT without exposing password`, async (t) => {
  const { POST } = await import("../app/api/auth/login/route");
  const { default: prisma } = await import("./prisma");
  const { hashPassword, verifyAccessToken } = await import("./auth");
  const passwordHash = await hashPassword("Demo@123");
  stub(t, prisma.user, "findFirst", async ({ where }: { where: object }) => {
    assert.deepEqual(where, identifier.includes("@") ? { email: "test@example.com" } : { phone: identifier });
    return { id: userId, fullName: "Test", email: "test@example.com", phone: "0900000002", role: "CUSTOMER", passwordHash };
  });
  const response = await POST(post("/api/auth/login", { identifier, password: "Demo@123" }));
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.tokenType, "Bearer"); assert.equal(data.expiresIn, 604800);
  assert.equal((await verifyAccessToken(data.accessToken))?.userId, userId);
  assert.equal("passwordHash" in data.user, false);
});
for (const existing of [false, true]) test(`LOGIN-03/${existing ? "wrong password" : "unknown user"}: generic 401 and no JWT`, async (t) => {
  const { POST } = await import("../app/api/auth/login/route");
  const { default: prisma } = await import("./prisma");
  const { hashPassword } = await import("./auth");
  const hash = await hashPassword("Different@123");
  stub(t, prisma.user, "findFirst", async () => existing ? { passwordHash: hash } : null);
  const response = await POST(post("/api/auth/login", { identifier: "test@example.com", password: "Demo@123" }));
  assert.equal(response.status, 401); assert.equal((await response.json()).data, undefined);
});
