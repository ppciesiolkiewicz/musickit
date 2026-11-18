import assert from "node:assert/strict";
import test from "node:test";
import { composeDay } from "@/features/plan/model/compose";
import { PERSONAS } from "./personas";
import { seedCandidates, simulate } from "./composeLab";

const persona = (id: string) => PERSONAS.find((p) => p.id === id)!.answers;

test("seedCandidates: only the areas asked for, each with its steps and an id", () => {
  const voice = seedCandidates(["voice"]);
  assert.ok(voice.length > 10);
  assert.ok(voice.every((c) => c.exercise.area === "voice" && c.blockId && c.steps.length > 0 && c.minutes > 0));
});

test("simulate: day 1 is what composeDay makes of the same input", () => {
  const answers = persona("guitar-beginner");
  const blocks = seedCandidates(answers.areas);
  const [first] = simulate({ answers, date: "2026-11-18", days: 1, seed: "lab", rating: "none" }, blocks);
  const day = composeDay({ answers, solid: new Map(), blocks, date: "2026-11-18", yesterday: [], keep: [], declined: [], seed: "lab:2026-11-18:0" });
  assert.deepEqual(first.day, day);
  assert.ok(first.day.exercises.length > 0);
});

test("simulate: no day repeats a block of the day before, and Solid ratings make steps solid and bring review", () => {
  const answers = persona("voice-beginner");
  const days = simulate({ answers, date: "2026-11-18", days: 5, seed: "lab", rating: "solid" });
  for (let i = 1; i < days.length; i++) {
    const before = new Set(days[i - 1].day.exercises.map((e) => e.blockId));
    assert.ok(days[i].day.exercises.every((e) => !before.has(e.blockId)), `day ${i + 1}`);
  }
  assert.equal(days[0].solid, 0);
  assert.ok(days[4].solid > 0);
  assert.ok(days.slice(1).some((d) => d.trace.picks.some((p) => p.stage === "review")));
});

test("simulate: an exercise with a Key selector carries the player's keys", () => {
  const days = simulate({ answers: { ...persona("voice-beginner"), keys: 2 }, date: "2026-11-18", days: 7, seed: "lab", rating: "none" });
  const keyed = days.flatMap((d) => d.day.exercises).filter((e) => e.keys);
  assert.ok(keyed.length > 0, "the seed has voice blocks with a Key selector");
  assert.ok(keyed.every((e) => JSON.stringify(e.keys) === JSON.stringify({ now: [9, 7], back: [4, 0] })));
});
