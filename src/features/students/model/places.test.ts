import { test } from "node:test";
import assert from "node:assert/strict";
import { activeOn, canGive, countLine, fullLine, monthStart, placesLine, placesState } from "./places";

test("monthStart and activeOn: a plan given this calendar month counts, last month's doesn't", () => {
  assert.equal(monthStart("2026-11-18"), "2026-11-01");
  assert.equal(activeOn("2026-11-01", "2026-11-30"), true);
  assert.equal(activeOn("2026-10-31", "2026-11-01"), false);
  assert.equal(activeOn("2026-12-31", "2027-01-01"), false, "the year turns too");
  assert.equal(activeOn(null, "2026-11-18"), false);
});

test("placesState: open, room, at the limit, into the extras, full", () => {
  assert.deepEqual(placesState({ limit: null, extra: 0, active: 99 }), { kind: "open" });
  assert.deepEqual(placesState({ limit: 15, extra: 2, active: 14 }), { kind: "room" });
  assert.deepEqual(placesState({ limit: 15, extra: 2, active: 15 }), { kind: "at-limit", limit: 15, left: 2 });
  assert.deepEqual(placesState({ limit: 15, extra: 2, active: 16 }), { kind: "extras", limit: 15, left: 1 });
  assert.deepEqual(placesState({ limit: 15, extra: 2, active: 17 }), { kind: "full", limit: 15, extra: 2 });
  assert.deepEqual(placesState({ limit: 15, extra: 0, active: 15 }), { kind: "full", limit: 15, extra: 0 }, "no extras: the limit is full");
  assert.deepEqual(placesState({ limit: 0, extra: 0, active: 0 }), { kind: "full", limit: 0, extra: 0 });
});

test("canGive: a student already active always gets another week; a new one needs a place", () => {
  const full = { limit: 15, extra: 2, active: 17 };
  assert.equal(canGive(full, true), true);
  assert.equal(canGive(full, false), false);
  assert.equal(canGive({ limit: 15, extra: 2, active: 16 }, false), true);
  assert.equal(canGive({ limit: null, extra: 0, active: 500 }, false), true);
});

test("the words", () => {
  assert.equal(countLine(15, 12), "12 of 15 active students");
  assert.equal(placesLine({ kind: "room" }), null);
  assert.equal(placesLine({ kind: "open" }), null);
  assert.match(placesLine({ kind: "at-limit", limit: 15, left: 2 })!, /^You've given plans to the 15 students your plan covers this month\. 2 more are on us, so carry on\. If you often teach more than 15 students a month/);
  assert.match(placesLine({ kind: "at-limit", limit: 15, left: 1 })!, /1 more is on us/);
  assert.match(placesLine({ kind: "extras", limit: 50, left: 1 })!, /^1 extra student left this month, on us\./);
  assert.match(placesLine({ kind: "extras", limit: 50, left: 2 })!, /^2 extra students left/);
  assert.match(fullLine(15, 2), /^That's your plan's 15 students and 2 extra for this month\. Students you already gave a plan/);
  assert.match(fullLine(15, 0), /^That's your plan's 15 students for this month\./);
});
