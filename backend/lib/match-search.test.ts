import assert from "node:assert/strict";
import { test } from "node:test";
import { matchQuerySchema, matchTimeRange } from "./match-search";

test("validates real dates, sorting and exclusive date/weekend filters", () => {
  for (const query of [{ date: "2026-02-30" }, { sort: "invalid" }, { date: "2026-09-26", period: "weekend" }, { search: "a".repeat(101) }]) {
    assert.equal(matchQuerySchema.safeParse(query).success, false);
  }
  assert.equal(matchQuerySchema.parse({ search: "  kèo  " }).search, "kèo");
});

test("a Vietnam date uses inclusive midnight and exclusive next midnight", () => {
  const now = new Date("2026-09-21T08:00:00Z");
  const range = matchTimeRange({ date: "2026-09-22", period: "all" }, now);
  assert.equal(range.gte?.toISOString(), "2026-09-21T17:00:00.000Z");
  assert.equal(range.lt?.toISOString(), "2026-09-22T17:00:00.000Z");
  assert.equal(range.gt, now);
});

test("weekend on Sunday retains this weekend, Monday moves to next weekend", () => {
  const sunday = matchTimeRange({ period: "weekend" }, new Date("2026-09-20T04:00:00Z"));
  assert.equal(sunday.gte?.toISOString(), "2026-09-18T17:00:00.000Z");
  assert.equal(sunday.lt?.toISOString(), "2026-09-20T17:00:00.000Z");
  const monday = matchTimeRange({ period: "weekend" }, new Date("2026-09-20T17:01:00Z"));
  assert.equal(monday.gte?.toISOString(), "2026-09-25T17:00:00.000Z");
});
