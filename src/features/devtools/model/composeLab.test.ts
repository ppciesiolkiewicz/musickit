import assert from "node:assert/strict";
import test from "node:test";
import { composeDay } from "@/features/plan/model/compose";
import { PERSONAS } from "./personas";
import { nextVersion, seedCandidates, simulate } from "./composeLab";

const persona = (id: string) => PERSONAS.find((p) => p.id === id)!.answers;

test("seedCandidates: only the areas asked for, each with its steps (a warm-up has none) and an id", () => {
  const voice = seedCandidates(["voice"]);
  assert.ok(voice.length > 10);
  assert.ok(voice.every((c) => c.exercise.area === "voice" && c.blockId && (c.steps.length > 0 || c.exercise.kind === "warm-up") && c.minutes > 0));
  assert.ok(voice.every((c) => c.choiceId.startsWith(`${c.blockId}/`) && c.exercise.blockId === c.blockId && c.exercise.choiceId === c.choiceId));
});

test("simulate: day 1 is what composeDay makes of the same input", () => {
  const answers = persona("guitar-beginner");
  const blocks = seedCandidates(answers.areas);
  const [first] = simulate({ answers, date: "2026-11-18", days: 1, seed: "lab", rating: "none" }, blocks);
  const day = composeDay({ answers, solid: new Map(), blocks, date: "2026-11-18", yesterday: [], keep: [], declined: [], seed: "lab:2026-11-18:0" });
  assert.deepEqual(first.day, day);
  assert.ok(first.day.exercises.length > 0);
});

test("simulate: no day repeats a choice of the day before, and Solid ratings make steps solid and bring review", () => {
  const answers = persona("voice-beginner");
  const days = simulate({ answers, date: "2026-11-18", days: 5, seed: "lab", rating: "solid" });
  for (let i = 1; i < days.length; i++) {
    const before = new Set(days[i - 1].day.exercises.map((e) => e.choiceId));
    assert.ok(days[i].day.exercises.every((e) => e.choiceId && !before.has(e.choiceId)), `day ${i + 1}`);
  }
  assert.equal(days[0].solid, 0);
  assert.ok(days[4].solid > 0);
  assert.ok(days.slice(1).some((d) => d.trace.picks.some((p) => p.stage === "review")));
});

test("simulate: an exercise with a Key selector carries the player's keys", () => {
  const days = simulate({ answers: { ...persona("voice-beginner"), keys: 2 }, date: "2026-11-18", days: 7, seed: "lab", rating: "none" });
  const keyed = days.flatMap((d) => d.day.exercises).filter((e) => e.given?.keys && e.kind !== "warm-up");
  assert.ok(keyed.length > 0, "the seed has voice blocks with a Key selector");
  assert.ok(keyed.every((e) => JSON.stringify(e.given?.keys) === JSON.stringify({ now: [9, 7], back: [4, 0] })));
});

test("simulate: the seed's voice warm-ups that can change key open in a key of the day's voice exercises or a neighbour, not always the same one", () => {
  const days = simulate({ answers: persona("voice-beginner"), date: "2026-11-18", days: 14, seed: "lab", rating: "none" });
  const opened = new Map<string, Set<number>>();
  for (const d of days) {
    const sec = d.trace.sections.find((s) => s.area === "voice");
    for (const e of d.day.exercises.filter((x) => x.kind === "warm-up" && x.moves?.key)) {
      const key = e.given!.keys!.now[0];
      assert.ok(sec!.warmUp.keys.pool.includes(key), `${d.date} ${e.blockId}`);
      opened.set(e.blockId!, (opened.get(e.blockId!) ?? new Set()).add(key));
    }
  }
  assert.ok(opened.size > 0, "the seed has voice warm-ups with a key move");
  assert.ok([...opened.values()].some((keys) => keys.size > 1), "a warm-up that comes back comes back in another key");
});

test("nextVersion: the composer's own next roll for a rating of the version an exercise has now", () => {
  const e = {
    title: "Run", minutes: 5, area: "guitar", steps: ["pentatonic-positions:1"], blockId: "b", choiceId: "b/one", moves: { key: "any", bpm: { from: 60, to: 90, step: 10 } }, given: { keys: { now: [9], back: [] }, bpm: { now: 60, back: [] } },
    cells: [{ type: "tool", tool: { type: "backing-band", bpm: 60, key: 9, parts: { click: "on" } } }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } }],
  } as never;
  const d = { answers: persona("guitar-new"), history: [], date: "2026-11-19" };
  const hard = nextVersion(e, d, "lab", 1)!;
  assert.deepEqual(hard.given, { keys: { now: [9], back: [] }, bpm: { now: 60, back: [] } }, "found hard at the first version: back or same are both the first version");
  assert.equal(hard.roll!.last!.stars, 1);
  const outcomes = Array.from({ length: 30 }, (_, i) => nextVersion(e, d, `p${i}`, 5)!.roll!.outcome);
  assert.ok(outcomes.includes("move") && outcomes.every((o) => o === "move" || o === "same"));
  assert.deepEqual(nextVersion(e, d, "lab", 5), nextVersion(e, d, "lab", 5), "the same player, block and rating roll the same");
  assert.equal(nextVersion({ title: "Plain", minutes: 5, cells: [], blockId: "x", choiceId: "x/one" } as never, d, "lab", 5), null);
  assert.equal(nextVersion({ ...(e as object), choiceId: undefined } as never, d, "lab", 5), null, "no choice: nothing to roll for");
});
