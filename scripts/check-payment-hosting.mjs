// Read-only deployment checks: never create payments, sign callbacks or confirm bookings.
const backend = new URL(process.argv[2] || "https://len-keo-thoi-backend.vercel.app").origin;
const frontend = new URL(process.argv[3] || "https://booking-courts-web-app.vercel.app").origin;
let failures = 0;
async function check(name, origin, path, validate, options = {}) {
  try {
    const response = await fetch(`${origin}${path}`, {
      redirect: "manual", signal: AbortSignal.timeout(30000), ...options,
    });
    await validate(response);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function requireCheck(value, message) { if (!value) throw new Error(message); }
await check("Backend + database", backend, "/api/health", async (r) => {
  requireCheck(r.status === 200, `HTTP ${r.status}`);
  const body = await r.json();
  requireCheck(body.success && body.data?.database === "connected", "Database not connected");
});
await check("Courts CORS", backend, "/api/courts?limit=1", async (r) => {
  requireCheck(r.status === 200, `HTTP ${r.status}`);
  requireCheck(r.headers.get("access-control-allow-origin") === frontend, "CORS origin mismatch");
  requireCheck((await r.json()).success, "Courts API failed");
}, { headers: { Origin: frontend } });
await check("Confirmation preflight", backend, "/api/owner/bookings/confirm", async (r) => {
  requireCheck(r.status === 204, `HTTP ${r.status}`);
  requireCheck(r.headers.get("access-control-allow-origin") === frontend, "CORS origin mismatch");
  requireCheck(/Authorization/i.test(r.headers.get("access-control-allow-headers") || ""), "Authorization header not allowed");
}, { method: "OPTIONS", headers: { Origin: frontend, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" } });
await check("Unsigned IPN rejected publicly", backend, "/api/payments/vnpay/ipn", async (r) => {
  requireCheck(r.status === 200, `HTTP ${r.status}: IPN may be protected`);
  requireCheck((await r.json()).RspCode === "97", "Expected checksum rejection 97; check VNPay env");
});
for (const path of ["/api/payments/vnpay/status?txnRef=" + "a".repeat(32), "/api/owner/bookings", "/api/notifications"]) {
  await check(`Unauthenticated ${path.split("?")[0]}`, backend, path, async (r) => {
    requireCheck(r.status === 401, `Expected 401, got ${r.status}`);
  });
}
await check("Unauthenticated confirmation rejected", backend, "/api/owner/bookings/confirm", async (r) => {
  requireCheck(r.status === 401, `Expected 401, got ${r.status}`);
}, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
await check("Return goes to production frontend", backend, "/api/payments/vnpay/return", async (r) => {
  requireCheck(r.status === 303, `HTTP ${r.status}`);
  const target = new URL(r.headers.get("location"));
  requireCheck(target.origin === frontend && target.pathname === "/payment/result", "Wrong return destination");
  requireCheck(target.searchParams.get("error") === "invalid-signature", "Unsigned return should be rejected");
});
for (const path of ["/payment/result?txnRef=" + "a".repeat(32), "/owner", "/history"]) {
  await check(`Frontend deep link ${path.split("?")[0]}`, frontend, path, async (r) => {
    requireCheck(r.status === 200, `HTTP ${r.status}: deploy SPA rewrite`);
    requireCheck((await r.text()).includes('id="root"'), "Not the application HTML");
  });
}
console.log(`Checks finished: ${failures} failure(s). No transaction data written.`);
process.exitCode = failures ? 1 : 0;
