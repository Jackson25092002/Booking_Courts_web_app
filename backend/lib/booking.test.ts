import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { post, invalidJson, customerToken, userId, courtId, fieldId, secondFieldId, futureDate, stub } from "./test-support";
import { intervalsOverlap, getVietnamDateTimeParts, isValidDateString } from "./booking-time";

const selection = (start = "18:00", end = "19:00", field = fieldId) => ({ courtFieldId: field, startsAt: futureDate(start), endsAt: futureDate(end) });
async function setup(t: TestContext, { missing = false, conflict = false, failure = "" } = {}) {
  const { default: prisma } = await import("./prisma");
  const { POST } = await import("../app/api/bookings/route");
  const token = await customerToken();
  let writes = 0;
  const transaction = stub(t, prisma, "$transaction", async (callback: (tx: unknown) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, "Serializable");
    if (failure) throw { code: failure };
    return callback({
      courtField: { findMany: async ({ where }: { where: { id: { in: string[] }; courtId: string; isActive: boolean; court: { isActive: boolean } } }) => {
        assert.equal(where.courtId, courtId); assert.equal(where.isActive, true); assert.equal(where.court.isActive, true);
        return missing ? [] : where.id.in.map((id) => ({ id, court: { pricePerHour: 90000, openTime: "06:00", closeTime: "23:00" } }));
      } },
      bookingSlot: { findFirst: async ({ where }: { where: { booking: { status: { in: string[] } } } }) => {
        assert.deepEqual(where.booking.status.in, ["PENDING", "CONFIRMED", "PAID"]);
        return conflict ? { id: "occupied" } : null;
      } },
      booking: { create: async ({ data }: { data: Record<string, unknown> }) => { writes++; return { id: "test-booking", ...data }; } },
    });
  });
  return { POST, token, transaction, writes: () => writes };
}
test("BOOK-01: missing login, bad JSON, UUID and empty selection rejected before transaction", async (t) => {
  const s = await setup(t);
  assert.equal((await s.POST(post("/api/bookings", {}))).status, 401);
  assert.equal((await s.POST(invalidJson("/api/bookings", s.token))).status, 400);
  for (const body of [{}, { courtId, selections: [] }, { courtId: "invalid", selections: [selection()] }]) {
    assert.equal((await s.POST(post("/api/bookings", body, s.token))).status, 400);
  }
  assert.equal(s.transaction.mock.callCount(), 0);
});
test("BOOK-02: multiple fields and adjacent/disjoint slots priced on server", async (t) => {
  const s = await setup(t);
  const response = await s.POST(post("/api/bookings", {
    courtId, selections: [selection("18:00", "18:30"), selection("18:30", "19:00"), selection("18:00", "19:00", secondFieldId), selection("20:00", "20:30")],
    totalAmount: 1, userId: "attacker", status: "PAID",
  }, s.token));
  assert.equal(response.status, 201);
  const booking = (await response.json()).data.booking;
  assert.equal(booking.totalAmount, 225000); assert.equal(booking.userId, userId); assert.equal(booking.status, "PENDING");
  assert.deepEqual(booking.slots.create.map((v: { price: number }) => v.price), [45000, 45000, 90000, 45000]);
  assert.equal(s.writes(), 1);
});
test("BOOK-03: legacy single selection remains supported", async (t) => {
  const s = await setup(t);
  const response = await s.POST(post("/api/bookings", { courtId, ...selection() }, s.token));
  assert.equal(response.status, 201); assert.equal((await response.json()).data.booking.totalAmount, 90000);
});
const invalidSelections = {
  reversed: [selection("19:00", "18:00")], zeroDuration: [selection("18:00", "18:00")],
  shortDuration: [selection("18:00", "18:15")], wrongDuration: [selection("18:00", "18:45")],
  past: [{ courtFieldId: fieldId, startsAt: "2020-01-01T18:00:00+07:00", endsAt: "2020-01-01T19:00:00+07:00" }],
  overlap: [selection("18:00", "19:00"), selection("18:30", "19:30")],
  duplicate: [selection(), selection()], misaligned: [selection("18:15", "19:15")],
  beforeOpening: [selection("05:30", "06:30")], afterClosing: [selection("22:30", "23:30")],
  crossesMidnight: [{ ...selection("23:30", "23:30"), endsAt: new Date(new Date(futureDate("23:30")).getTime() + 3600000).toISOString() }],
};
for (const [name, selections] of Object.entries(invalidSelections)) test(`BOOK-04/${name}: invalid interval never creates booking`, async (t) => {
  const s = await setup(t);
  assert.equal((await s.POST(post("/api/bookings", { courtId, selections }, s.token))).status, 400);
  assert.equal(s.writes(), 0);
});
test("BOOK-05: unavailable, inactive or wrong-court field rejected", async (t) => {
  const s = await setup(t, { missing: true });
  assert.equal((await s.POST(post("/api/bookings", { courtId, selections: [selection()] }, s.token))).status, 404);
  assert.equal(s.writes(), 0);
});
test("BOOK-06: conflict returns 409 without creating a booking", async (t) => {
  const s = await setup(t, { conflict: true });
  assert.equal((await s.POST(post("/api/bookings", { courtId, selections: [selection()] }, s.token))).status, 409);
  assert.equal(s.writes(), 0);
});
for (const code of ["P2002", "P2034"]) test(`BOOK-07/${code}: concurrent conflict returns 409`, async (t) => {
  const s = await setup(t, { failure: code });
  assert.equal((await s.POST(post("/api/bookings", { courtId, selections: [selection()] }, s.token))).status, 409);
});
test("BOOK-08: overlap boundaries, leap dates and Vietnam midnight", () => {
  const time = (v: string) => new Date(futureDate(v));
  assert.equal(intervalsOverlap(time("18:00"), time("19:00"), time("19:00"), time("20:00")), false);
  assert.equal(intervalsOverlap(time("18:00"), time("19:00"), time("18:30"), time("19:30")), true);
  assert.equal(isValidDateString("2024-02-29"), true); assert.equal(isValidDateString("2025-02-29"), false);
  assert.deepEqual(getVietnamDateTimeParts(new Date("2026-01-01T17:00:00Z")), { date: "2026-01-02", time: "00:00" });
});
