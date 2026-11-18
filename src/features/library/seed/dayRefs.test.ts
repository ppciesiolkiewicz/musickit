import assert from "node:assert/strict";
import { test } from "node:test";
import { dayRefs } from "./dayRefs";

test("finds words that name another day of the week, at any depth", () => {
  const exercise = {
    title: "Day 2's run, twice as fast",
    cells: [{ type: "text", text: "Same frets as yesterday. Keep the best one for next week." }],
    slot: { why: "This week's intervals in one game." },
  };
  assert.deepEqual(dayRefs(exercise), ["Day 2", "yesterday", "next week", "This week"]);
});

test("leaves idioms and plain text alone", () => {
  assert.deepEqual(dayRefs({ text: "Make music from day one. Play it every day, then weekly." }), []);
});
