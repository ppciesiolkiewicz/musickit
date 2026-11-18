import { test } from "node:test";
import assert from "node:assert/strict";
import { PAST_DAYS, dayWords, hasNewPicks, pastDays } from "./today";
import type { ComposedDay } from "./compose";
import type { PlanExercise, StoredPlan } from "./types";

const ex = (title: string, more: Partial<PlanExercise> = {}): PlanExercise => ({ title, minutes: 5, cells: [{ type: "text", text: "x" }], ...more });

test("dayWords: the title is the date's weekday, day and month", () => {
  assert.equal(dayWords("2026-11-18", []).title, "Wednesday 18 November");
  assert.equal(dayWords("2027-01-01", []).title, "Friday 1 January");
});

test("dayWords: the theme names the day's topics once each, in the order they come", () => {
  const exercises = [ex("a", { topic: "guitar-scales" }), ex("b", { topic: "guitar-basic-chords" }), ex("c", { topic: "guitar-scales" }), ex("d", { topic: "voice-pitch" })];
  assert.equal(dayWords("2026-11-18", exercises).theme, "Scales, basic chords and pitch");
  assert.equal(dayWords("2026-11-18", exercises.slice(0, 2)).theme, "Scales and basic chords");
  assert.equal(dayWords("2026-11-18", exercises.slice(0, 1)).theme, "Scales");
});

test("dayWords: a topic is found from the steps when the exercise names none; a name in capitals stays so", () => {
  assert.equal(dayWords("2026-11-18", [ex("a", { steps: ["pentatonic-positions:1"] })]).theme, "Scales");
  const caged = dayWords("2026-11-18", [ex("a", { topic: "voice-pitch" }), ex("b", { topic: "guitar-caged" })]).theme;
  assert.equal(caged, "Pitch and CAGED");
});

test("dayWords: no topic at all leaves the theme empty", () => {
  assert.equal(dayWords("2026-11-18", [ex("a")]).theme, "");
  assert.equal(dayWords("2026-11-18", [ex("a", { topic: "nope", steps: ["nope:1"] })]).theme, "");
});

const plan = (blockIds: string[], rated: number[]): StoredPlan => ({
  id: "p",
  startedOn: "2026-11-18",
  done: Object.fromEntries(rated.map((i) => [`0:${i}`, true as const])),
  rated: Object.fromEntries(rated.map((i) => [`0:${i}`, { stars: 3 as const, at: "2026-11-18T10:00:00Z" }])),
  config: { title: "t", days: [{ theme: "", exercises: blockIds.map((b) => ex(b, { blockId: b })) }] },
  composed: { attempt: 0, declined: [], short: false },
});
const answer = (blockIds: string[]): ComposedDay => ({ exercises: blockIds.map((b) => ex(b, { blockId: b })), steps: [], short: false });

test("hasNewPicks: an answer holding only today's rated exercises has none", () => {
  assert.equal(hasNewPicks(plan(["a", "b", "c"], [0, 2]), answer(["a", "c"])), false);
  assert.equal(hasNewPicks(plan(["a", "b"], []), answer([])), false);
});

test("hasNewPicks: any exercise not rated today is a new pick", () => {
  assert.equal(hasNewPicks(plan(["a", "b", "c"], [0]), answer(["a", "d"])), true);
  // an unrated exercise of today's plan coming back is still new to the player's eye: it replaces nothing, but counts
  assert.equal(hasNewPicks(plan(["a", "b"], [0]), answer(["a", "b"])), true);
  assert.equal(hasNewPicks(null, answer(["a"])), true);
});

test("pastDays: composed days only, newest first, the last 14", () => {
  const day = (on: string, composed = true): StoredPlan => ({ ...plan([], []), id: on, startedOn: on, ...(composed ? {} : { composed: undefined }) });
  const days = Array.from({ length: 20 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, "0")}`));
  const shuffled = [days[3], day("2026-11-01", false), ...days.slice(4).reverse(), ...days.slice(0, 3)];
  const got = pastDays(shuffled);
  assert.equal(got.length, PAST_DAYS);
  assert.deepEqual(got.map((p) => p.startedOn), days.slice(6).reverse().map((p) => p.startedOn));
});
