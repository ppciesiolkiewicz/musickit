import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVEL_MARKS, STEP, levelWord, moved, tenth } from "./sliders";

test("the scale: four levels, a tenth at a time", () => {
  assert.deepEqual(LEVEL_MARKS, ["New", "Beginner", "Intermediate", "Advanced"]);
  assert.equal(STEP, 0.1);
});

test("moved: only the topics changed by at least half a step, at the value the slider shows", () => {
  const start = { chords: 1.3, strum: 0.8, scales: 0, songs: 2 };
  assert.deepEqual(moved(start, { ...start }), {}, "nothing moved, nothing sent");
  assert.deepEqual(moved(start, { ...start, chords: 1.7, scales: 0.1 }), { chords: 1.7, scales: 0.1 });
  assert.deepEqual(moved(start, { ...start, strum: 0.8000000001 }), {}, "a float's last digit is not a move");
  assert.deepEqual(moved(start, { ...start, songs: 1.2 }), { songs: 1.2 }, "down counts too");
  assert.deepEqual(moved(start, { ...start, songs: 2.1 + 0.2 }), { songs: 2.3 }, "sent at a tenth");
  assert.deepEqual(moved({ chords: 1 }, { chords: 1, lead: 0.5 }), { lead: 0.5 }, "a topic with no start counts as moved");
});

test("tenth: a score as the slider shows it", () => {
  assert.equal(tenth(1.3333), 1.3);
  assert.equal(tenth(0.1 + 0.2), 0.3);
  assert.equal(tenth(-1), 0);
  assert.equal(tenth(4), 3);
});

test("levelWord: the level, and how far to the next one", () => {
  assert.equal(levelWord(0), "New");
  assert.equal(levelWord(1), "Beginner");
  assert.equal(levelWord(1.4), "Beginner, 40% to Intermediate");
  assert.equal(levelWord(0.1 + 0.2), "New, 30% to Beginner");
  assert.equal(levelWord(2.96), "Advanced", "rounded to a tenth first");
  assert.equal(levelWord(2.9), "Intermediate, 90% to Advanced");
  assert.equal(levelWord(3), "Advanced");
});
