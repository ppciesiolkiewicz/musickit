import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./schedule";

test("addDays: a local date plus n days, across month, year and leap day", () => {
  assert.equal(addDays("2026-11-10", 1), "2026-11-11");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-11-10", 0), "2026-11-10");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});
