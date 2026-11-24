import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_BLOCKS, SEED_PLANS, type SeedBlockFile, type SeedPlanFile } from "@/features/library/seed";
import { exerciseOf } from "@/features/library/seed/choices";
import { startDay } from "@/features/plan/model/schedule";
import { EMPTY_STATE, type PlanExercise } from "@/features/plan/model/types";
import { curatedBlocks, planRowsOf, seedBlocks } from "./seedBlocks";
import { memoryUserDataRepo } from "./repo.memory";

const NOW = new Date(2026, 10, 15, 12);
const LATER = new Date(2026, 10, 16, 12);

/** A plain exercise, so its minutes change no cell. */
const plain = (title: string, over: Record<string, unknown> = {}) => ({ title, area: "guitar", topic: "guitar-techniques", concepts: ["picking"], tags: ["technique"], why: "w", cells: [{ type: "text", text: "Play it slowly." }], ...over });
const fileOf = (id: string, exercise: Record<string, unknown>, choices: SeedBlockFile["choices"], over: Partial<SeedBlockFile> = {}): SeedBlockFile => ({ id, model: "m1", versions: { prompt: 5, agents: 2, teaching: 5 }, note: "n", exercise, choices, ...over });
const one = (id: string, over: Record<string, unknown> = {}) => fileOf(id, plain("T", over), [{ name: "beginner", level: "beginner", steps: [], minutes: 4 }]);
const planFile = (id: string, days: { block: string; choice: string; minutes?: number }[][]): SeedPlanFile =>
  ({ id, answers: {} as SeedPlanFile["answers"], model: "m", versions: { prompt: 5, agents: 2, teaching: 5 }, note: "n", plan: { title: id, days: days.map((exercises, i) => ({ theme: `d${i}`, exercises })) } });

test("every seed block file is a curated block, with one choice per choice in its file, in order", () => {
  const { blocks, skipped } = curatedBlocks();
  assert.deepEqual(skipped, []);
  assert.equal(blocks.length, SEED_BLOCKS.length);
  for (const f of SEED_BLOCKS) {
    const b = blocks.find((x) => x.id === f.id)!;
    assert.deepEqual(b.choices.map((c) => [c.id, c.name, c.place]), f.choices.map((c, i) => [`${f.id}/${c.name}`, c.name, i]));
  }
});

test("a curated block's moves, steps and level sit on its choices, never in its content", () => {
  const f = SEED_BLOCKS.find((x) => x.id === "guitar-beginner-down-up-picking")!;
  const [b] = curatedBlocks([f]).blocks;
  assert.equal("moves" in b.content, false);
  assert.ok(b.choices[0].moves, "the choice keeps the moves");
  assert.deepEqual(b.choices[0].steps, [...f.choices[0].steps].sort());
  assert.equal(b.choices[0].level, f.choices[0].level ?? b.choices[0].level);
  assert.deepEqual(b.provenance, { model: f.model, promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching });
});

test("a curated block keeps its tags and slot from the file's exercise", () => {
  const [b] = curatedBlocks([one("guitar-a-b", { learnBefore: ["/course/8/one-arpeggio"] })]).blocks;
  assert.deepEqual([b.area, b.topic, b.concepts, b.tags], ["guitar", "guitar-techniques", ["picking"], ["technique"]]);
  assert.deepEqual(b.slot, { why: "w", learnBefore: ["/course/8/one-arpeggio"] });
  assert.equal(b.choices[0].minutes, 4);
});

test("a block file that doesn't parse is skipped and named", () => {
  const r = curatedBlocks([one("guitar-ok"), fileOf("guitar-broken", {}, [{ name: "beginner", steps: [], minutes: 4 }])]);
  assert.deepEqual(r.blocks.map((b) => b.id), ["guitar-ok"]);
  assert.deepEqual(r.skipped, ["guitar-broken"]);
});

test("a block file that doesn't parse is reported, and nothing is written or made inactive", async () => {
  const repo = memoryUserDataRepo();
  await seedBlocks(repo, NOW, { files: [one("guitar-a-b"), one("guitar-c-d")], plans: [] });
  const before = { blocks: repo.peekBlocks(), choices: repo.peekChoices() };
  const broken = fileOf("guitar-c-d", {}, [{ name: "beginner", steps: [], minutes: 4 }]);
  const lines: string[] = [];
  const r = await seedBlocks(repo, LATER, { files: [one("guitar-a-b"), broken], plans: [planFile("p1", [[{ block: "guitar-a-b", choice: "beginner" }]])], log: (l) => lines.push(l) });
  assert.deepEqual(r, { blocks: 0, choices: 0, deactivated: 0, revised: 0, planBlocks: 0, skipped: ["guitar-c-d"], unknownRefs: [] });
  assert.ok(lines.some((l) => l.includes("guitar-c-d")));
  assert.deepEqual({ blocks: repo.peekBlocks(), choices: repo.peekChoices() }, before);
  assert.equal(repo.peekChoices().get("guitar-c-d/beginner")!.active, true);
  assert.deepEqual(repo.peekPlanBlocks("p1"), []);
});

test("seeding stores curated blocks, their choices and the app's owner row", async () => {
  const repo = memoryUserDataRepo();
  const r = await seedBlocks(repo, NOW, { files: [one("guitar-a-b")], plans: [] });
  assert.deepEqual(r, { blocks: 1, choices: 1, deactivated: 0, revised: 0, planBlocks: 0, skipped: [], unknownRefs: [] });
  const b = repo.peekBlocks().get("guitar-a-b")!;
  assert.equal(b.kind, "curated");
  assert.equal(b.revision, 1);
  assert.deepEqual(repo.peekOwners(), [{ userId: null, blockId: "guitar-a-b", source: "seed" }]);
  assert.deepEqual(repo.peekChoices().get("guitar-a-b/beginner"), { id: "guitar-a-b/beginner", blockId: "guitar-a-b", name: "beginner", level: "beginner", steps: [], moves: null, minutes: 4, active: true, place: 0, updatedAt: NOW });
});

test("seeding twice changes nothing", async () => {
  const repo = memoryUserDataRepo();
  const plans = [planFile("p1", [[{ block: SEED_BLOCKS[0].id, choice: SEED_BLOCKS[0].choices[0].name }]])];
  await seedBlocks(repo, NOW, { plans });
  const snap = () => ({ blocks: repo.peekBlocks(), choices: repo.peekChoices(), owners: repo.peekOwners(), rows: repo.peekPlanBlocks("p1") });
  const first = snap();
  const r = await seedBlocks(repo, LATER, { plans });
  assert.equal(r.deactivated, 0);
  assert.equal(r.revised, 0);
  assert.deepEqual(snap(), first);
  assert.ok([...repo.peekBlocks().values()].every((b) => b.revision === 1));
});

test("a block's revision goes up by one each time its file is seeded changed, and only then", async () => {
  const repo = memoryUserDataRepo();
  const two = fileOf("guitar-a-b", plain("T"), [{ name: "beginner", level: "beginner", steps: [], minutes: 4 }, { name: "new", level: "new", steps: [], minutes: 5 }]);
  const rev = (id: string) => repo.peekBlocks().get(id)!.revision;
  const seed = async (...files: SeedBlockFile[]) => (await seedBlocks(repo, LATER, { files, plans: [] })).revised;
  const other = one("guitar-c-d");
  assert.equal(await seed(two, other), 0);
  assert.deepEqual([rev("guitar-a-b"), rev("guitar-c-d")], [1, 1]);
  // the text: the changed block only, and once however much of it changed
  const text = { ...two, exercise: plain("T", { cells: [{ type: "text", text: "Play it slower." }], tags: ["rhythm"], why: "another why" }), model: "m2" };
  assert.equal(await seed(text, other), 1);
  assert.deepEqual([rev("guitar-a-b"), rev("guitar-c-d")], [2, 1]);
  // the same files again: nothing
  assert.equal(await seed(text, other), 0);
  assert.equal(rev("guitar-a-b"), 2);
  // a choice changed
  const longer = { ...text, choices: [{ ...text.choices[0], minutes: 6 }, text.choices[1]] };
  assert.equal(await seed(longer, other), 1);
  assert.equal(rev("guitar-a-b"), 3);
  // a choice added, and the text with it: still one
  const three = { ...longer, exercise: plain("T2"), choices: [...longer.choices, { name: "advanced", level: "advanced" as const, steps: [], minutes: 7 }] };
  assert.equal(await seed(three, other), 1);
  assert.equal(rev("guitar-a-b"), 4);
  // a choice dropped (made inactive), and a file removed (all its choices made inactive)
  assert.equal(await seed({ ...three, choices: three.choices.slice(0, 2) }), 2);
  assert.deepEqual([rev("guitar-a-b"), rev("guitar-c-d")], [5, 2]);
  // the note is not stored, so it is no change
  assert.equal(await seed({ ...three, choices: three.choices.slice(0, 2), note: "another note" }), 0);
  assert.deepEqual([rev("guitar-a-b"), rev("guitar-c-d")], [5, 2]);
});

test("a text edit keeps the id and updates the content, tags and provenance", async () => {
  const repo = memoryUserDataRepo();
  await seedBlocks(repo, NOW, { files: [one("guitar-a-b")], plans: [] });
  const edited = { ...one("guitar-a-b", { cells: [{ type: "text", text: "Play it slower." }], tags: ["rhythm"] }), model: "m2" };
  await seedBlocks(repo, LATER, { files: [edited], plans: [] });
  const b = repo.peekBlocks().get("guitar-a-b")!;
  assert.deepEqual(b.key.content.cells, [{ type: "text", text: "Play it slower." }]);
  assert.deepEqual(b.key.tags, ["rhythm"]);
  assert.equal(b.provenance.model, "m2");
  assert.equal(repo.peekBlocks().size, 1);
  assert.equal(repo.peekOwners().length, 1);
});

test("a choice dropped from the file becomes inactive; a block file removed makes all its choices inactive", async () => {
  const repo = memoryUserDataRepo();
  const two = fileOf("guitar-a-b", plain("T"), [{ name: "beginner", level: "beginner", steps: [], minutes: 4 }, { name: "new", level: "new", steps: [], minutes: 5 }]);
  await seedBlocks(repo, NOW, { files: [two, one("guitar-c-d")], plans: [] });
  const r = await seedBlocks(repo, LATER, { files: [{ ...two, choices: [two.choices[0]] }], plans: [] });
  assert.equal(r.deactivated, 2);
  const c = repo.peekChoices();
  assert.equal(c.get("guitar-a-b/beginner")!.active, true);
  assert.equal(c.get("guitar-a-b/new")!.active, false);
  assert.equal(c.get("guitar-a-b/new")!.updatedAt.getTime(), LATER.getTime());
  assert.equal(c.get("guitar-c-d/beginner")!.active, false);
  // never deleted, and back on when the file lists it again
  await seedBlocks(repo, LATER, { files: [two], plans: [] });
  assert.equal(repo.peekChoices().get("guitar-a-b/new")!.active, true);
});

test("a draft choice is stored inactive", async () => {
  const repo = memoryUserDataRepo();
  const f = fileOf("guitar-a-b", plain("T"), [{ name: "beginner", level: "beginner", steps: [], minutes: 4 }, { name: "new", level: "new", steps: [], minutes: 5, draft: true }]);
  const r = await seedBlocks(repo, NOW, { files: [f], plans: [] });
  assert.equal(r.choices, 2);
  assert.equal(repo.peekChoices().get("guitar-a-b/new")!.active, false);
  assert.equal(repo.peekChoices().get("guitar-a-b/new")!.place, 1);
});

test("plan rows name the block and choice of each ref", async () => {
  const files = [one("guitar-a-b"), one("guitar-c-d")];
  const p = planFile("p1", [[{ block: "guitar-a-b", choice: "beginner" }, { block: "guitar-c-d", choice: "beginner", minutes: 7 }], [{ block: "guitar-c-d", choice: "beginner" }]]);
  const rows = [
    { day: 0, place: 0, blockId: "guitar-a-b", choiceId: "guitar-a-b/beginner", minutes: 4 },
    { day: 0, place: 1, blockId: "guitar-c-d", choiceId: "guitar-c-d/beginner", minutes: 7 },
    { day: 1, place: 0, blockId: "guitar-c-d", choiceId: "guitar-c-d/beginner", minutes: 4 },
  ];
  assert.deepEqual(planRowsOf(p, curatedBlocks(files).blocks).rows, rows);
  const repo = memoryUserDataRepo();
  const r = await seedBlocks(repo, NOW, { files, plans: [p] });
  assert.equal(r.planBlocks, 3);
  assert.deepEqual(repo.peekPlanBlocks("p1"), rows);
});

test("a ref to a block or choice that isn't seeded is left out and named, and the places close up as in the reply", () => {
  const p = planFile("p1", [[{ block: "guitar-gone", choice: "beginner" }, { block: "guitar-a-b", choice: "nope" }, { block: "guitar-a-b", choice: "beginner" }]]);
  const r = planRowsOf(p, curatedBlocks([one("guitar-a-b")]).blocks);
  assert.deepEqual(r.rows, [{ day: 0, place: 0, blockId: "guitar-a-b", choiceId: "guitar-a-b/beginner", minutes: 4 }]);
  assert.deepEqual(r.unknown, ["guitar-gone/beginner", "guitar-a-b/nope"]);
});

test("every seed plan's refs name a seeded block and choice", () => {
  const { blocks } = curatedBlocks();
  for (const p of SEED_PLANS) assert.deepEqual(planRowsOf(p, blocks).unknown, [], p.id);
});

test("every seed choice put in a started day keeps its block and choice ids", () => {
  let n = 0;
  for (const f of SEED_BLOCKS)
    for (const c of f.choices) {
      const exercise = exerciseOf(f, c) as unknown as PlanExercise;
      const s = startDay(EMPTY_STATE, { exercises: [exercise], steps: [], short: false }, { date: "2026-11-18", attempt: 0 }, () => `n${++n}`);
      const got = s.current!.config.days[0].exercises[0];
      assert.deepEqual([got.blockId, got.choiceId], [f.id, `${f.id}/${c.name}`], f.id);
    }
});
