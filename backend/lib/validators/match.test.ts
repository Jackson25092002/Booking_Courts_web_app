import assert from "node:assert/strict";
import { test } from "node:test";
import { createMatchSchema } from "./match";

const validMatch = {
  courtId: "10000000-0000-4000-8000-000000000001",
  title: "Kèo cầu lông cuối tuần",
  level: "Trung bình",
  startsAt: "2026-10-10T18:00:00+07:00",
  maxPlayers: 4,
  currentPlayers: 2,
};

test("accepts a recruiting match and preserves the Vietnam time offset", () => {
  const result = createMatchSchema.safeParse(validMatch);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(new Date(result.data.startsAt).toISOString(), "2026-10-10T11:00:00.000Z");
  }
});

test("rejects a full match and invalid player counts", () => {
  for (const players of [0, 4, 5, 21]) {
    assert.equal(createMatchSchema.safeParse({ ...validMatch, currentPlayers: players }).success, false);
  }
});

test("rejects malformed court, timestamp and overly long descriptions", () => {
  for (const change of [
    { courtId: "not-a-uuid" },
    { startsAt: "2026-10-10T18:00" },
    { description: "x".repeat(1001) },
  ]) {
    assert.equal(createMatchSchema.safeParse({ ...validMatch, ...change }).success, false);
  }
});
