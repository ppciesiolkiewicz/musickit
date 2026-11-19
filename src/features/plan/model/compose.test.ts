import { test } from "node:test";
import assert from "node:assert/strict";
import type { Stars } from "@/features/progress/stars";
import { PERSONAS } from "@/features/devtools/model/personas";
import { composeDay, composeWeek, explainDay, rollSeed, type Candidate, type ComposeInput } from "./compose";
import { daySteps, solidRatedAt } from "./daySteps";
import type { ProgressEntry } from "@/features/progress/log";
import { PATH, type Track } from "./path";
import type { PlanExercise } from "./types";

const guitar = PERSONAS.find((p) => p.id === "guitar-new")!.answers;

const mk = (id: string, topic: string, n: number): Track => ({
  id, label: id, area: "guitar", topic, merges: [],
  steps: Array.from({ length: n }, () => ({ level: "new", text: "x" })) as unknown as Track["steps"],
});
// chords and scales: one fresh step each at the start (a:1, b:1)
const AB = [mk("a", "guitar-basic-chords", 3), mk("b", "guitar-scales", 3)];

/** A block with one choice; the choice's id is the block's id, so a test can name either. */
function cand(id: string, steps: string[], minutes = 5, mine: { stars: Stars; ratedAt: string } | null = null, use = { times: 0, seconds: 0 }): Candidate {
  const exercise: PlanExercise = { title: id, cells: [], minutes, steps, blockId: id, choiceId: id };
  return { blockId: id, choiceId: id, steps, minutes, use, mine, exercise };
}
/** Choice `name` of block `block`: its own choice id, `<block>/<name>`. */
const choiceOf = (block: string, name: string, steps: string[], minutes = 5): Candidate => {
  const c = cand(`${block}/${name}`, steps, minutes);
  return { ...c, blockId: block, exercise: { ...c.exercise, blockId: block } };
};
const choiceIds = (d: { exercises: PlanExercise[] }) => d.exercises.map((e) => e.choiceId!);

const none = new Map<string, string>();
const base = (over: Partial<ComposeInput> = {}): ComposeInput => ({
  answers: { ...guitar, minutes: 20 }, solid: none, blocks: [], date: "2026-11-18",
  yesterday: [], keep: [], declined: [], seed: "p1:2026-11-18:0", ...over,
});
const ids = (d: { exercises: PlanExercise[] }) => d.exercises.map((e) => e.blockId!);
const total = (d: { exercises: PlanExercise[] }) => d.exercises.reduce((s, e) => s + e.minutes, 0);
const many = (step: string, n: number, minutes = 5) => Array.from({ length: n }, (_, i) => cand(`${step}#${i}`, [step], minutes));

// --- minutes

test("minutes: 20 minutes of 5-minute blocks gives 4 exercises, not short", () => {
  const d = composeDay(base({ blocks: [...many("a:1", 3), ...many("b:1", 3)] }), AB);
  assert.equal(d.exercises.length, 4);
  assert.equal(total(d), 20);
  assert.equal(d.short, false);
});

test("minutes: a day runs over by less than its last block, never under by more than 5", () => {
  for (const m of [3, 4, 5, 7, 10]) {
    const d = composeDay(base({ blocks: [...many("a:1", 5, m), ...many("b:1", 5, m)] }), AB);
    assert.ok(total(d) >= 15, `${m}: ${total(d)}`);
    assert.ok(total(d) < 20 + m, `${m}: ${total(d)}`);
    assert.equal(d.short, false);
  }
});

// --- new and review

const solidA1 = new Map([["a:1", "2026-11-01T10:00:00Z"]]);
const reviewOf = (d: { exercises: PlanExercise[] }, review: string[]) => d.exercises.filter((e) => e.steps!.some((s) => review.includes(s)));

test("new and review: one solid step gives exactly one review exercise, and it is last", () => {
  const d = composeDay(base({ solid: solidA1, blocks: [...many("a:1", 3), ...many("a:2", 3), ...many("b:1", 3)] }), AB);
  const r = reviewOf(d, ["a:1"]);
  assert.equal(r.length, 1);
  assert.equal(d.exercises.at(-1), r[0]);
});

test("new and review: 30 minutes a day gives two review exercises, last", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const d = composeDay(base({ answers: { ...guitar, minutes: 30 }, solid, blocks: [...many("a:1", 3), ...many("b:1", 3), ...many("a:2", 5), ...many("b:2", 5)] }), AB);
  assert.deepEqual(d.exercises.slice(-2).map((e) => e.steps![0]), ["a:1", "b:1"]);
  assert.equal(reviewOf(d, ["a:1", "b:1"]).length, 2);
});

test("new and review: nothing solid gives no review exercise, the whole day is new", () => {
  const d = composeDay(base({ blocks: [...many("a:1", 3), ...many("b:1", 3)] }), AB);
  assert.ok(d.exercises.every((e) => ["a:1", "b:1"].includes(e.steps![0])));
  assert.equal(total(d), 20);
});

// --- which block for a step

const one = { ...guitar, minutes: 5 };
const A = [mk("a", "guitar-basic-chords", 3)];

test("which block: a block rated 2 stars comes before an unrated one", () => {
  const blocks = [cand("u", ["a:1"]), cand("low", ["a:1"], 5, { stars: 2, ratedAt: "2026-11-10T10:00:00Z" })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks }), A)), ["low"]);
});

test("which block: the most recently rated low block comes first", () => {
  const blocks = [cand("old", ["a:1"], 5, { stars: 1, ratedAt: "2026-11-01T10:00:00Z" }), cand("new", ["a:1"], 5, { stars: 3, ratedAt: "2026-11-10T10:00:00Z" })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks }), A)), ["new"]);
});

test("which block: a block rated 5 only when no unrated and no low block is left", () => {
  const five = cand("five", ["a:1"], 5, { stars: 5, ratedAt: "2026-11-10T10:00:00Z" });
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [five, cand("u", ["a:1"])] }), A)), ["u"]);
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [five, cand("u", ["a:1"])], declined: ["u"] }), A)), ["five"]);
});

test("which block: of blocks rated 4 or 5, the one rated longest ago", () => {
  const blocks = [cand("recent", ["a:1"], 5, { stars: 5, ratedAt: "2026-11-10T10:00:00Z" }), cand("long", ["a:1"], 5, { stars: 4, ratedAt: "2026-11-01T10:00:00Z" })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks }), A)), ["long"]);
});

test("which block: an opened, unrated block is new, not had", () => {
  const blocks = [cand("five", ["a:1"], 5, { stars: 5, ratedAt: "2026-11-01T10:00:00Z" }), cand("opened", ["a:1"], 5, null, { times: 3, seconds: 400 })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks }), A)), ["opened"]);
});

test("which block: among unrated blocks the pick is random among the 3 least used", () => {
  const blocks = Array.from({ length: 10 }, (_, i) => cand(`u${i}`, ["a:1"], 5, null, { times: 1, seconds: (9 - i) * 60 }));
  const picks = new Set<string>();
  for (let s = 0; s < 30; s++) {
    const [p] = ids(composeDay(base({ answers: one, blocks, seed: `p:${s}` }), A));
    assert.ok(["u9", "u8", "u7"].includes(p), p);
    picks.add(p);
  }
  assert.ok(picks.size > 1);
});

test("which block: least used is seconds, then times, then id", () => {
  const blocks = [
    cand("c", ["a:1"], 5, null, { times: 0, seconds: 0 }), cand("b", ["a:1"], 5, null, { times: 0, seconds: 0 }),
    cand("x", ["a:1"], 5, null, { times: 1, seconds: 0 }), cand("a", ["a:1"], 5, null, { times: 0, seconds: 0 }),
    cand("y", ["a:1"], 5, null, { times: 0, seconds: 1 }),
  ];
  for (let s = 0; s < 30; s++) assert.ok(["a", "b", "c"].includes(ids(composeDay(base({ answers: one, blocks, seed: `p:${s}` }), A))[0]));
});

test("which block: a block that also names a later step of the track is not handed out on the earlier step", () => {
  const d = composeDay(base({ blocks: [cand("above", ["a:1", "a:2"])] }), A);
  assert.deepEqual(d.exercises, []);
  assert.equal(d.short, true);
});

test("which block: a block appears once in a day, also when it fits two of the day's steps", () => {
  const d = composeDay(base({ blocks: [cand("both", ["a:1", "b:1"])] }), AB);
  assert.deepEqual(ids(d), ["both"]);
});

// --- never above the player's reach

test("reach: a cross-track block whose other step is far ahead is never picked; the day is short instead", () => {
  const d = composeDay({ ...base(), answers: guitar, blocks: [cand("far", ["open-chords:7", "strumming:1"])] });
  assert.deepEqual(d.exercises, []);
  assert.equal(d.short, true);
});

test("reach: a block naming a step ahead on another hand-made track is never picked", () => {
  const d = composeDay(base({ answers: one, blocks: [cand("far", ["b:1", "a:3"])] }), AB);
  assert.deepEqual(d.exercises, []);
});

test("reach: a cross-track block whose other step is known, within reach or open is picked", () => {
  assert.deepEqual(ids(composeDay(base({ answers: one, solid: solidA1, blocks: [cand("known", ["b:1", "a:1"])] }), AB)), ["known"]);
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [cand("reach", ["b:1", "a:1"])] }), AB)), ["reach"]);
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [cand("open", ["b:1", "a2:1"])] }), ABC)), ["open"]);
});

test("reach: a block naming a step that is not on the path is never picked", () => {
  for (const odd of ["zz:1", "a:9", "nocolon"]) {
    assert.deepEqual(composeDay(base({ answers: one, blocks: [cand("odd", ["a:1", odd])] }), AB).exercises, [], odd);
  }
});

// --- choices: the composer picks choices, a block is where they come from

test("a choice used yesterday is not picked, another choice of the same block may be", () => {
  const blocks = [choiceOf("blk", "one", ["a:1"]), choiceOf("blk", "two", ["a:1"])];
  const d = composeDay(base({ answers: one, blocks, yesterday: ["blk/one"] }), A);
  assert.deepEqual(choiceIds(d), ["blk/two"]);
  assert.deepEqual(ids(d), ["blk"]);
  // a block id is not a choice id: naming the block bars none of its choices
  assert.equal(composeDay(base({ answers: one, blocks, yesterday: ["blk"] }), A).exercises.length, 1);
  // declined reads choice ids the same way
  assert.deepEqual(choiceIds(composeDay(base({ answers: one, blocks, declined: ["blk/two"] }), A)), ["blk/one"]);
});

test("two choices of one block are never in the same day", () => {
  const blocks = [choiceOf("blk", "one", ["a:1"]), choiceOf("blk", "two", ["b:1"]), choiceOf("blk", "three", ["a:1"])];
  for (let s = 0; s < 10; s++) {
    const { day, trace } = explainDay(base({ blocks, seed: `p${s}:2026-11-18:0` }), AB);
    assert.equal(day.exercises.length, 1, `seed ${s}: ${choiceIds(day).join()}`);
    assert.equal(trace.library.usable, 3);
  }
  // nor beside a kept exercise of the block
  const keep = [{ ...choiceOf("blk", "one", ["a:1"]).exercise, id: "slot-1" }];
  const d = composeDay(base({ blocks, keep }), AB);
  assert.deepEqual(choiceIds(d), ["blk/one"]);
});

test("the trace names the choice of each pick", () => {
  const { trace } = explainDay(base({ answers: one, blocks: [choiceOf("blk", "one", ["a:1"])] }), A);
  assert.deepEqual(trace.picks.map((p) => [p.blockId, p.choiceId]), [["blk", "blk/one"]]);
});

// --- yesterday, declined, a step with no block

test("yesterday and declined: never picked, also when they are the only blocks on a step", () => {
  const d = composeDay(base({ blocks: [cand("y", ["a:1"]), cand("d", ["b:1"])], yesterday: ["y"], declined: ["d"] }), AB);
  assert.deepEqual(d.exercises, []);
  assert.equal(d.short, true);
});

test("a step with no usable block: the nearest earlier step of its track is used", () => {
  const blocks = [cand("y", ["a:2"]), cand("d", ["a:2"]), cand("early1", ["a:1"]), cand("early2", ["a:1"]), cand("r", ["a:1"])];
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, solid: solidA1, blocks, yesterday: ["y"], declined: ["d"] }), A);
  assert.ok(!ids(d).includes("y") && !ids(d).includes("d"));
  assert.equal(d.exercises.length, 2);
  assert.ok(d.exercises.every((e) => e.steps![0] === "a:1"));
  assert.ok(!d.steps.includes("a:2"));
  assert.deepEqual(d.steps, ["a:1"]);
});

test("a step with no block on its track is skipped", () => {
  const d = composeDay(base({ blocks: many("b:1", 4) }), AB);
  assert.deepEqual(d.steps, ["b:1"]);
  assert.equal(d.exercises.length, 4);
});

// --- order of filling when fresh steps run out

const ABC = [mk("a", "guitar-basic-chords", 3), mk("a2", "guitar-basic-chords", 3), mk("b", "guitar-scales", 3)];

test("fill order 1: open steps come after the fresh steps", () => {
  // fresh a:1, b:1; a2:1 is open (the chords topic is full)
  const d = composeDay(base({ blocks: [cand("A", ["a:1"]), cand("B", ["b:1"]), cand("O", ["a2:1"])] }), ABC);
  assert.deepEqual(ids(d).sort(), ["A", "B", "O"]);
  assert.equal(ids(d)[2], "O");
  assert.equal(d.steps[2], "a2:1");
});

test("fill order 2: then a second block on a step already in the day, in the same step order", () => {
  const blocks = [...many("a:1", 2), ...many("b:1", 2), cand("O", ["a2:1"]), cand("O2", ["a2:1"])];
  const d = composeDay(base({ answers: { ...guitar, minutes: 30 }, blocks }), ABC);
  assert.equal(d.exercises.length, 6);
  const order = d.exercises.map((e) => e.steps![0]);
  assert.deepEqual(order.slice(3), order.slice(0, 3));
});

test("fill order 2: a third block too, until none is left", () => {
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, blocks: many("b:1", 3) }), AB);
  assert.equal(d.exercises.length, 3);
  assert.equal(d.short, false);
});

test("fill order 3: then more review blocks than the one or two", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const tracks = [mk("a", "guitar-basic-chords", 2), mk("b", "guitar-scales", 1)];
  // fresh a:2 only; review a:1 then b:1; 20 minutes plans one review block
  const d = composeDay(base({ solid, blocks: [cand("N", ["a:2"]), cand("R1", ["a:1"]), cand("R2", ["b:1"])] }), tracks);
  assert.deepEqual(ids(d), ["N", "R1", "R2"]);
});

test("fill order 3: a second block on the day's steps comes before more review", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const tracks = [mk("a", "guitar-basic-chords", 2), mk("b", "guitar-scales", 1)];
  const blocks = [cand("N1", ["a:2"]), cand("N2", ["a:2"]), cand("R1", ["a:1"]), cand("R2", ["b:1"])];
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, solid, blocks }), tracks);
  assert.deepEqual(ids(d).sort(), ["N1", "N2", "R1"]);
  assert.equal(ids(d).at(-1), "R1");
});

test("fill order 3: more review goes round the review steps until the minutes are filled", () => {
  const d = composeDay(base({ solid: new Map([["a:1", "2026-11-01T10:00:00Z"]]), blocks: many("a:1", 4) }), [mk("a", "guitar-basic-chords", 1)]);
  assert.equal(d.exercises.length, 4);
  assert.equal(d.short, false);
});

test("fill order 3: more review tries a review step not used yet before a second block on a used one", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const tracks = [mk("a", "guitar-basic-chords", 1), mk("b", "guitar-scales", 1)];
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, solid, blocks: [...many("a:1", 3), ...many("b:1", 3)] }), tracks);
  assert.deepEqual(d.exercises.map((e) => e.steps![0]), ["a:1", "b:1"]);
});

test("fill order 4: then a short day", () => {
  const d = composeDay(base({ answers: { ...guitar, minutes: 30 }, blocks: [cand("A", ["a:1"]), cand("B", ["b:1"])] }), AB);
  assert.equal(total(d), 10);
  assert.equal(d.short, true);
  assert.deepEqual(d.steps, ["a:1", "b:1"]);
});

test("not short when the day ends 5 or fewer minutes under", () => {
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, blocks: [cand("A", ["a:1"]), cand("B", ["b:1"])] }), AB);
  assert.equal(d.short, false);
});

// --- keep (asking for another plan)

const kept = (id: string, minutes: number): PlanExercise => ({ title: `kept ${id}`, cells: [], minutes, steps: ["a:1"], blockId: id, choiceId: id, id: `slot-${id}` });

test("keep: kept exercises come first and unchanged, and the new picks fill the rest", () => {
  const keep = [kept("k1", 4), kept("k2", 4)];
  const d = composeDay(base({ keep, blocks: [...many("a:1", 4), ...many("b:1", 4)] }), AB);
  assert.equal(d.exercises[0], keep[0]);
  assert.equal(d.exercises[1], keep[1]);
  const fresh = d.exercises.slice(2).reduce((s, e) => s + e.minutes, 0);
  assert.ok(fresh >= 12 && fresh < 17, String(fresh));
});

test("keep: with every exercise rated, a fresh set for the whole minutes is added", () => {
  const keep = [kept("k1", 10), kept("k2", 10)];
  const d = composeDay(base({ keep, blocks: [...many("a:1", 4), ...many("b:1", 4)] }), AB);
  const fresh = d.exercises.slice(2).reduce((s, e) => s + e.minutes, 0);
  assert.equal(fresh, 20);
});

test("keep: no new pick repeats a kept block", () => {
  const keep = [kept("a:1#0", 5)];
  const d = composeDay(base({ keep, blocks: [...many("a:1", 2), ...many("b:1", 2)] }), AB);
  assert.equal(ids(d).filter((i) => i === "a:1#0").length, 1);
});

// --- review focus

test("review focus 1: a new guitar player with a block on every first step gets a full day", () => {
  const blocks = PATH.filter((t) => t.area === "guitar").map((t) => cand(`${t.id}-1`, [`${t.id}:1`]));
  const d = composeDay({ ...base(), answers: guitar, blocks });
  assert.ok(total(d) >= guitar.minutes, String(total(d)));
  assert.equal(d.short, false);
});

test("review focus 5: every block declined and no earlier step: only the kept ones, short, and it returns", () => {
  const keep = [kept("k1", 5)];
  const blocks = [...many("a:1", 3), ...many("b:1", 3)];
  const d = composeDay(base({ keep, blocks, declined: blocks.map((b) => b.choiceId) }), AB);
  assert.deepEqual(d.exercises, keep);
  assert.equal(d.short, true);
});

// --- the same answer twice

test("same input, same output; another seed may change the picks but not the steps", () => {
  const blocks = [...many("a:1", 10), ...many("b:1", 10)];
  const a = composeDay(base({ blocks }), AB);
  assert.deepEqual(composeDay(base({ blocks }), AB), a);
  const others = Array.from({ length: 10 }, (_, s) => composeDay(base({ blocks, seed: `other:${s}` }), AB));
  for (const o of others) assert.deepEqual(o.steps, a.steps);
  assert.ok(others.some((o) => ids(o).join() !== ids(a).join()));
});

// --- seven days

test("composeWeek: seven days, no block on two days running", () => {
  const blocks = [...many("a:1", 4), ...many("b:1", 4)];
  const week = composeWeek({ answers: { ...guitar, minutes: 10 }, solid: none, blocks, date: "2026-11-18", seed: "t" }, 7, AB);
  assert.equal(week.length, 7);
  for (let i = 1; i < 7; i++) {
    const before = new Set(ids(week[i - 1]));
    assert.ok(ids(week[i]).every((b) => !before.has(b)), `day ${i}`);
    assert.ok(week[i].exercises.length > 0);
  }
});

test("composeWeek: each day is composeDay with the next date, its own seed and the day before as yesterday", () => {
  const blocks = [...many("a:1", 4), ...many("b:1", 4)];
  const input = { answers: { ...guitar, minutes: 10 }, solid: none, blocks, date: "2026-11-18", seed: "t" };
  const week = composeWeek(input, 3, AB);
  assert.deepEqual(week[0], composeDay({ ...input, seed: "t:0", yesterday: [], keep: [], declined: [] }, AB));
  assert.deepEqual(week[1], composeDay({ ...input, date: "2026-11-19", seed: "t:1", yesterday: ids(week[0]), keep: [], declined: [] }, AB));
  assert.deepEqual(week[2], composeDay({ ...input, date: "2026-11-20", seed: "t:2", yesterday: ids(week[1]), keep: [], declined: [] }, AB));
});

test("daySteps sanity for these tracks", () => {
  assert.deepEqual([...daySteps({ answers: guitar, solid: none, date: "2026-11-18" }, AB).fresh].sort(), ["a:1", "b:1"]);
  assert.deepEqual(daySteps({ answers: guitar, solid: none, date: "2026-11-18" }, ABC).open, ["a2:1"]);
});

// --- a reserved review block fits a third of the day

const solidA1b = new Map([["a:1", "2026-11-01T10:00:00Z"]]);
const tracksA3 = [mk("a", "guitar-basic-chords", 3), mk("b", "guitar-scales", 3)];

test("review fits a third: 15 minutes and only a 10-minute review block gives no review, three new", () => {
  const blocks = [cand("R10", ["a:1"], 10), ...many("a:2", 3), ...many("b:1", 3)];
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, solid: solidA1b, blocks }), tracksA3);
  assert.ok(!ids(d).includes("R10"), ids(d).join());
  assert.equal(d.exercises.length, 3);
  assert.ok(d.exercises.every((e) => e.steps![0] !== "a:1"));
});

test("review fits a third: with a 5-minute review block too, that one is picked and is last", () => {
  const blocks = [cand("R10", ["a:1"], 10), cand("R5", ["a:1"], 5), ...many("a:2", 3), ...many("b:1", 3)];
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, solid: solidA1b, blocks }), tracksA3);
  assert.equal(ids(d).at(-1), "R5");
  assert.ok(!ids(d).includes("R10"));
  assert.equal(d.exercises.length, 3);
});

test("review fits a third: a review step with no block that fits is passed over for the next one", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const blocks = [cand("RA", ["a:1"], 10), cand("RB", ["b:1"], 5), ...many("a:2", 3), ...many("b:2", 3)];
  const d = composeDay(base({ answers: { ...guitar, minutes: 15 }, solid, blocks }), tracksA3);
  assert.equal(ids(d).at(-1), "RB");
  assert.ok(!ids(d).includes("RA"));
});

test("review fits a third: 30 minutes still gets two review blocks of 10 minutes", () => {
  const solid = new Map([["a:1", "2026-11-01T10:00:00Z"], ["b:1", "2026-11-02T10:00:00Z"]]);
  const blocks = [cand("RA", ["a:1"], 10), cand("RB", ["b:1"], 10), ...many("a:2", 3), ...many("b:2", 3)];
  const d = composeDay(base({ answers: { ...guitar, minutes: 30 }, solid, blocks }), tracksA3);
  assert.deepEqual(ids(d).slice(-2), ["RA", "RB"]);
});

// --- a rating with no time

test("a rating with no time sorts as the oldest: last among low blocks, first among solid ones", () => {
  const low = [cand("notime", ["a:1"], 5, { stars: 2, ratedAt: "" }), cand("dated", ["a:1"], 5, { stars: 2, ratedAt: "2026-11-01T10:00:00Z" })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: low }), A)), ["dated"]);
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [...low].reverse() }), A)), ["dated"]);
  const solid = [cand("dated", ["a:1"], 5, { stars: 5, ratedAt: "2026-11-01T10:00:00Z" }), cand("notime", ["a:1"], 5, { stars: 5, ratedAt: "" })];
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: solid }), A)), ["notime"]);
  assert.deepEqual(ids(composeDay(base({ answers: one, blocks: [...solid].reverse() }), A)), ["notime"]);
});

test("a rating with no time is the oldest for solid steps too: a dated rating wins, and review puts it first", () => {
  const e = (stars: number, at: string | undefined) => ({ id: `e${stars}`, planId: "p", exerciseId: "x", day: 0, exercise: 0, title: "t", stars, steps: ["open-chords:1"], ...(at === undefined ? {} : { at }) }) as unknown as ProgressEntry;
  for (const list of [[e(2, undefined), e(5, "2026-11-01T10:00:00Z")], [e(5, "2026-11-01T10:00:00Z"), e(2, undefined)]]) {
    assert.deepEqual([...solidRatedAt(list).keys()], ["open-chords:1"]);
  }
  const solid = new Map([["b:1", "2026-11-01T10:00:00Z"], ["a:1", ""]]);
  assert.deepEqual(daySteps({ answers: guitar, solid, date: "2026-11-18" }, AB).review, ["a:1", "b:1"]);
});

// --- keys

const keyed = (id: string, step: string, area: "guitar" | "voice"): Candidate => {
  const c = cand(id, [step]);
  const exercise = { ...c.exercise, area, choice: { options: [{ key: 9 }, { key: 7 }] }, cells: [{ type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9 } }] } as unknown as PlanExercise;
  return { ...c, exercise };
};

test("keys: an exercise with a Key selector gets the player's keys; one without gets none", () => {
  const blocks = [keyed("k", "a:1", "guitar"), cand("plain", ["b:1"])];
  const d = composeDay(base({ answers: { ...guitar, minutes: 10, keys: 1 }, blocks }), AB);
  const k = d.exercises.find((e) => e.blockId === "k")!;
  assert.deepEqual(k.given?.keys, { now: [7, 4], back: [9] }, "guitar on rung 1: G and E, with A to go back to");
  assert.equal(d.exercises.find((e) => e.blockId === "plain")!.given?.keys, undefined);
  assert.deepEqual((k.choice as { options: unknown[] }).options, [{ key: 9 }, { key: 7 }], "the block itself is as written");
});

test("keys: with no answer the area's level decides, and the answer changes no pick", () => {
  const blocks = [keyed("k", "a:1", "guitar"), cand("plain", ["b:1"])];
  const unasked = composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks }), AB);
  assert.deepEqual(unasked.exercises.find((e) => e.blockId === "k")!.given?.keys, { now: [9], back: [] }, "a beginner has A only");
  const top = composeDay(base({ answers: { ...guitar, minutes: 10, keys: 4 }, blocks }), AB);
  assert.deepEqual(ids(top), ids(unasked));
  assert.equal(top.exercises.find((e) => e.blockId === "k")!.given?.keys!.now.length, 3);
});

test("keys: the same answer is a different key in each area", () => {
  const voiceTrack: Track = { ...mk("v", "voice-pitch", 2), area: "voice" };
  const answers = { ...guitar, areas: ["guitar", "voice"] as ("guitar" | "voice")[], minutes: 10, keys: 0 as const };
  const d = composeDay(base({ answers, blocks: [keyed("g", "a:1", "guitar"), keyed("s", "v:1", "voice")] }), [...AB, voiceTrack]);
  assert.deepEqual(d.exercises.find((e) => e.blockId === "g")!.given?.keys, { now: [9], back: [] }, "A on guitar");
  assert.deepEqual(d.exercises.find((e) => e.blockId === "s")!.given?.keys, { now: [0], back: [] }, "C for the voice");
});

// --- the trace

test("explainDay: the day is composeDay's, and the trace names every pick with its stage, step and reason", () => {
  const input = base({ blocks: [...many("a:1", 3), ...many("b:1", 3)], yesterday: ["a:1#0"] });
  const { day, trace } = explainDay(input, AB);
  assert.deepEqual(day, composeDay(input, AB));
  assert.deepEqual(trace.library, { all: 6, inReach: 6, usable: 5 });
  assert.deepEqual(trace.minutes, { asked: 20, kept: 0, budget: 20, reviewCount: 1, reviewCap: 20 / 3, filled: 20 });
  assert.deepEqual(trace.picks.map((p) => p.stage), ["fresh", "fresh", "more", "more"]);
  assert.deepEqual(trace.picks.map((p) => p.blockId).sort(), ids(day).sort());
  assert.ok(trace.picks.every((p) => p.reason === "unrated" && p.step === p.asked));
  assert.deepEqual(trace.picks.map((p) => p.total), [5, 10, 15, 20]);
});

test("explainDay: a step with no block is listed as empty; one filled from an earlier step says which", () => {
  const solid = new Map([["a:1", "2026-11-01T00:00:00Z"]]);
  const { trace } = explainDay(base({ solid, blocks: many("a:1", 4) }), AB);
  assert.ok(trace.empty.includes("b:1"), JSON.stringify(trace.empty));
  const down = trace.picks.find((p) => p.asked === "a:2");
  assert.equal(down?.step, "a:1", "a:2 has no block: the nearest earlier step's is used");
});

// --- versions (ChoiceSplit): a block with moves gets a rolled version

const KEYED: Track[] = [mk("a", "guitar-basic-chords", 3), { ...mk("b", "guitar-scales", 3), keys: [[9], [7, 4], [0]] }];
const mover = (id: string, step: string): Candidate => {
  const c = cand(id, [step]);
  const exercise = {
    ...c.exercise, area: "guitar", moves: { key: "any", bpm: { from: 60, to: 90, step: 10 } },
    cells: [{ type: "tool", tool: { type: "backing-band", bpm: 60, key: 9, parts: { click: "on" } } }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } }],
  } as unknown as PlanExercise;
  return { ...c, exercise };
};
const FIRST_PLAY = { keys: { now: [9], back: [] }, bpm: { now: 60, back: [] } };
const playedRow = (id: string, blockId: string, step: string, stars: number, at: string, given?: ProgressEntry["given"]): ProgressEntry =>
  ({ id, planId: "p", exerciseId: `e-${id}`, day: 0, exercise: 0, title: blockId, steps: [step], blockId, choiceId: blockId, stars, at, ...(given ? { given } : {}) }) as ProgressEntry;
const givenOf = (d: { exercises: PlanExercise[] }, id: string) => d.exercises.find((e) => e.blockId === id)!.given;

test("versions: a first play opens in the track's first key and the block's starting tempo, whatever the player's rung", () => {
  const blocks = [mover("m", "b:1"), cand("plain", ["a:1"])];
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks }), KEYED);
  assert.deepEqual(givenOf(d, "m"), FIRST_PLAY, "A, not the beginner rung's E");
  assert.equal(givenOf(d, "plain"), undefined);
  assert.deepEqual((d.exercises.find((e) => e.blockId === "m")! as PlanExercise).moves, { key: "any", bpm: { from: 60, to: 90, step: 10 } }, "the block itself is as written");
});

test("versions: the roll is made once per rating, not per day or per try", () => {
  const blocks = [mover("m", "b:1"), cand("plain", ["a:1"])];
  const history = [playedRow("r1", "m", "b:1", 5, "2026-11-17T10:00:00.000Z", FIRST_PLAY)];
  const at = (seed: string, date: string) => givenOf(composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks, history, seed, date }), KEYED), "m");
  const one = at("p1:2026-11-18:0", "2026-11-18");
  assert.deepEqual(at("p1:2026-11-18:1", "2026-11-18"), one, "another try");
  assert.deepEqual(at("p1:2026-11-19:0", "2026-11-19"), one, "another day");
  assert.equal(rollSeed("p1", "m", "r1"), "p1:m:r1");
  assert.equal(rollSeed("p1", "m", undefined), "p1:m:");
  // over many players the 80% move shows: the roll does depend on who rolls
  const moved = Array.from({ length: 40 }, (_, i) => givenOf(composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks, history, seed: `q${i}:2026-11-18:0` }), KEYED), "m")!.moved ?? 0);
  assert.ok(moved.some((m) => m === 1) && moved.some((m) => m === 0));
});

test("versions: the trace carries the roll", () => {
  const { trace } = explainDay(base({ answers: { ...guitar, minutes: 10 }, blocks: [mover("m", "b:1")], history: [playedRow("r1", "m", "b:1", 5, "2026-11-17T10:00:00.000Z", FIRST_PLAY)] }), KEYED);
  const pick = trace.picks.find((p) => p.blockId === "m")!;
  assert.ok(pick.roll);
  assert.deepEqual(pick.roll.last, { stars: 5, given: FIRST_PLAY });
  assert.deepEqual(pick.roll.odds, { back: 0, same: 0.2, move: 0.8 });
  assert.deepEqual(pick.given, givenOf(explainDay(base({ answers: { ...guitar, minutes: 10 }, blocks: [mover("m", "b:1")], history: [playedRow("r1", "m", "b:1", 5, "2026-11-17T10:00:00.000Z", FIRST_PLAY)] }), KEYED).day, "m"));
});

test("versions: the newest rated play of the block is the one the roll starts from", () => {
  const top = { keys: { now: [0, 4, 7], back: [9] }, bpm: { now: 90, back: [80, 70] }, moved: 6 };
  const history = [playedRow("r1", "m", "b:1", 5, "2026-11-10T10:00:00.000Z", FIRST_PLAY), playedRow("r2", "m", "b:1", 5, "2026-11-17T10:00:00.000Z", top), playedRow("r3", "other", "b:1", 1, "2026-11-18T10:00:00.000Z")];
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks: [mover("m", "b:1")], history }), KEYED);
  assert.deepEqual(givenOf(d, "m"), top, "at the top of every move, easy stays the same version");
});

test("versions: a week gives a block the same version on every day it comes up; a kept exercise keeps its own", () => {
  const blocks = [mover("m", "b:1"), mover("n", "b:1"), cand("x", ["a:1"]), cand("y", ["a:1"])];
  const week = composeWeek({ answers: { ...guitar, minutes: 10 }, solid: none, blocks, date: "2026-11-16", seed: "t1", history: [playedRow("r1", "m", "b:1", 5, "2026-11-10T10:00:00.000Z", FIRST_PLAY)] }, 7, KEYED);
  const seen = week.flatMap((d) => d.exercises.filter((e) => e.blockId === "m").map((e) => JSON.stringify(e.given)));
  assert.ok(seen.length > 1);
  assert.equal(new Set(seen).size, 1);
  const kept = { ...mover("m", "b:1").exercise, given: { bpm: { now: 80, back: [70] }, moved: 2 } };
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks, keep: [kept] }), KEYED);
  assert.deepEqual(d.exercises[0].given, { bpm: { now: 80, back: [70] }, moved: 2 });
});

test("the roll reads only this choice's ratings", () => {
  const top = { keys: { now: [0, 4, 7], back: [9] }, bpm: { now: 90, back: [80, 70] }, moved: 6 };
  const m = mover("m", "b:1");
  const mine = { ...m, choiceId: "m/one", exercise: { ...m.exercise, choiceId: "m/one" } };
  const row = (id: string, choiceId: string | undefined, given: ProgressEntry["given"], at: string) => {
    const r = playedRow(id, "m", "b:1", 5, at, given);
    delete r.choiceId;
    return (choiceId ? { ...r, choiceId } : r) as ProgressEntry;
  };
  const day = (history: ProgressEntry[]) => givenOf(composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks: [mine], history }), KEYED), "m");
  // another choice of the same block, and a row of the block with no choice, are not this choice's plays: a first play
  assert.deepEqual(day([row("r1", "m/two", top, "2026-11-17T10:00:00.000Z"), row("r2", undefined, top, "2026-11-17T11:00:00.000Z")]), FIRST_PLAY);
  // its own row is
  assert.deepEqual(day([row("r1", "m/one", top, "2026-11-10T10:00:00.000Z"), row("r2", "m/two", FIRST_PLAY, "2026-11-17T10:00:00.000Z")]), top);
  assert.equal(rollSeed("p1", "m/one", "r1"), "p1:m/one:r1");
});

test("versions: the first step a block names on the path decides its keys", () => {
  const off = mover("m", "b:1");
  const d = composeDay(base({ answers: { ...guitar, minutes: 10 }, blocks: [{ ...off, exercise: { ...off.exercise, steps: ["nowhere:1", "b:1"] } }] }), KEYED);
  assert.deepEqual(givenOf(d, "m"), FIRST_PLAY, "the first step it names on the path decides");
});
