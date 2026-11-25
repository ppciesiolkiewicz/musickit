import { test } from "node:test";
import assert from "node:assert/strict";
import { blockIdOf, blockKeyOf } from "./blockId";
import { cleanExercise } from "./cleanExercise";
import { parseExercise } from "./config";
import type { ProgressEntry } from "@/features/progress/log";
import { solidRatedAt } from "./daySteps";
import { applyGiven, cleanGiven, paramWarnings, parseMoves, scoringRows, selectorsOf, written, type Moves } from "./moves";
import { outcome } from "./outcome";
import { entryFor } from "./progressLog";
import type { Cell, PlanTool } from "./tools";
import type { PlanExercise } from "./types";

const A = 9, G = 7;
const band = (bpm: number, key = A, more: Record<string, unknown> = {}): PlanTool => ({ type: "backing-band", bpm, key, parts: { click: "on" }, ...more }) as PlanTool;
const neck = (key = A, more: Record<string, unknown> = {}): PlanTool => ({ type: "scale-neck", scale: "minor-pentatonic", key, boxes: [1], ...more }) as PlanTool;
const tool = (t: PlanTool): Cell => ({ type: "tool", tool: t });
const BPM = { from: 60, to: 90, step: 10 };

// --- Task 1: parseMoves

test("parseMoves: a key and a tempo move that match the tools read with no warning", () => {
  const p = parseMoves({ key: "any", bpm: BPM }, [band(60), neck()]);
  assert.deepEqual(p, { moves: { key: "any", bpm: BPM }, warnings: [] });
});

test("parseMoves: absent is no moves and no warning", () => {
  assert.deepEqual(parseMoves(undefined, [band(60)]), { moves: null, warnings: [] });
});

test("parseMoves: bpm starts where the first tool with a tempo is written", () => {
  const p = parseMoves({ bpm: { from: 70, to: 90, step: 10 } }, [neck(), band(60), band(80)]);
  assert.deepEqual(p.moves, { bpm: BPM });
  assert.deepEqual(p.warnings, ["moves: bpm starts at 70 but the first tool with a tempo is at 60."]);
});

test("parseMoves: a part it can't read or use is dropped and named", () => {
  assert.deepEqual(parseMoves({ bpm: { from: 60, to: 50, step: 10 } }, [band(60)]), { moves: null, warnings: ["moves: left out bpm (it needs from, to at or above from, and a step of 1 or more)."] });
  assert.deepEqual(parseMoves({ bpm: { from: 60, to: 90, step: 0 } }, [band(60)]).moves, null);
  assert.deepEqual(parseMoves({ key: "fixed" }, [neck()]), { moves: null, warnings: ['moves: left out key (write "any", or leave it out).'] });
  assert.deepEqual(parseMoves({ key: "any", position: [1, 2] }, [neck()]), { moves: { key: "any" }, warnings: ["moves: left out position (only key and bpm can move)."] });
  assert.deepEqual(parseMoves({ key: "any" }, [{ type: "note-finder" } as PlanTool]), { moves: null, warnings: ["moves: no tool that can change key."] });
  assert.deepEqual(parseMoves({ bpm: BPM }, [neck()]), { moves: null, warnings: ["moves: no tool with a tempo."] });
});

// --- Task 1: cleanGiven

const block = (moves: Moves | undefined, cells: Cell[] = [tool(band(60)), tool(neck())]) => ({ title: "t", ...(moves ? { moves } : {}), cells });

test("parseMoves: a key move with only chord names and no written key is left out and named", () => {
  const along = { type: "guitar-play-along", bpm: 70, shape: { shape: "chord-steps", chords: [{ chord: "Dm7", steps: ["b3"] }] } } as PlanTool;
  const p = parseMoves({ key: "any" }, [along]);
  assert.equal(p.moves, null);
  assert.deepEqual(p.warnings, ["moves: left out key (no tool says the key it is written in; give the play-along's shape a key)."]);
  assert.deepEqual(parseMoves({ key: "any" }, [{ ...along, shape: { ...(along as { shape: object }).shape, key: "c" } } as PlanTool]).moves, { key: "any" });
});

test("cleanGiven: a part the block has no move for, or outside its range, is dropped", () => {
  assert.equal(cleanGiven({ keys: { now: [A], back: [] }, bpm: { now: 120, back: [60] } }, block({ bpm: BPM })), null);
  assert.deepEqual(cleanGiven({ keys: { now: [G, A], back: [] }, bpm: { now: 70, back: [60] } }, block({ key: "any", bpm: BPM })), { keys: { now: [G, A], back: [] }, bpm: { now: 70, back: [60] } });
});

test("cleanGiven: back holds earlier values once each, never now, at most two; moved is a whole number", () => {
  assert.deepEqual(cleanGiven({ bpm: { now: 90, back: [90, 80, 80, 70, 60, "x"] }, moved: 3 }, block({ bpm: BPM })), { bpm: { now: 90, back: [80, 70] }, moved: 3 });
  assert.deepEqual(cleanGiven({ bpm: { now: 70, back: [] }, moved: 1.5 }, block({ bpm: BPM })), { bpm: { now: 70, back: [] } });
  assert.deepEqual(cleanGiven({ bpm: { now: 70, back: [] }, moved: -1 }, block({ bpm: BPM })), { bpm: { now: 70, back: [] } });
  assert.equal(cleanGiven("x", block({ bpm: BPM })), null);
  assert.equal(cleanGiven({ bpm: { now: "70" } }, block({ bpm: BPM })), null);
});

test("cleanGiven: a block of the old shape keeps keys for its Key selector, and nothing else", () => {
  const old = { title: "t", cells: [{ type: "section", heading: "h", choice: { options: [{ key: A }, { key: G }] }, cells: [tool(neck())] } as Cell] };
  assert.deepEqual(cleanGiven({ keys: { now: [G], back: [A] }, bpm: { now: 70, back: [] } }, old), { keys: { now: [G], back: [A] } });
  assert.equal(cleanGiven({ keys: { now: [G], back: [] } }, block(undefined)), null);
});

// --- Task 1: the block id, the parser, the cleaner

const ex = (more: Partial<PlanExercise> = {}): PlanExercise => ({ title: "Run", minutes: 5, cells: [tool(band(60)), tool(neck())], ...more });

test("block id: moves are part of what a block is, given is not", () => {
  const id = (e: PlanExercise) => blockIdOf(blockKeyOf(e));
  assert.notEqual(id(ex()), id(ex({ moves: { bpm: BPM } })));
  assert.equal(id(ex({ moves: { bpm: BPM } })), id(ex({ moves: { bpm: BPM }, given: { bpm: { now: 70, back: [60] }, moved: 1 } })));
});

const raw = (more: Record<string, unknown> = {}) => ({
  title: "Run #guitar #beginner #technique", minutes: 3, learnBefore: ["/course/5/pentatonic"],
  cells: [{ type: "text", text: "Play." }, { type: "tool", tool: { type: "backing-band", bpm: 60, key: "a", parts: { click: "on" } } }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [1] } }],
  ...more,
});

test("parseExercise: reads moves, and says what it changed", () => {
  const p = parseExercise(raw({ moves: { key: "any", bpm: { from: 60, to: 90, step: 10 } } }), "Day 1", []);
  assert.deepEqual(p.block!.moves, { key: "any", bpm: BPM });
  assert.equal(p.warnings.filter((w) => w.includes("moves")).length, 0);
  const off = parseExercise(raw({ moves: { bpm: { from: 80, to: 90, step: 10 } } }), "Day 1", []);
  assert.ok(off.warnings.includes("Day 1: moves: bpm starts at 80 but the first tool with a tempo is at 60."));
  assert.equal(parseExercise(raw(), "Day 1", []).block!.moves, undefined);
});

test("parseExercise: a choice that sets a part the block's moves set is left out", () => {
  const p = parseExercise(raw({
    moves: { key: "any" },
    cells: [{ type: "section", heading: "Roots", choice: { options: [{ key: "a" }, { key: "g" }] }, cells: [{ type: "text", text: "Play." }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [1] } }] }],
  }), "Day 1", []);
  const section = p.block!.cells[0];
  assert.ok(section.type === "section" && section.choice === undefined);
  assert.ok(p.warnings.includes('Day 1: "Roots" has moves and a choice that sets the same part; the choice is left out.'));
});

test("cleanExercise: moves are read again and given is cleaned against them; an old keys field is dropped", () => {
  const stored = { ...ex({ moves: { bpm: BPM }, given: { bpm: { now: 70, back: [60] }, keys: { now: [G], back: [] } } }), keys: { now: [G], back: [] } } as PlanExercise;
  const out = cleanExercise(stored);
  assert.deepEqual(out.moves, { bpm: BPM });
  assert.deepEqual(out.given, { bpm: { now: 70, back: [60] } });
  assert.equal("keys" in out, false);
  assert.equal(cleanExercise(ex({ given: { bpm: { now: 70, back: [] } } })).given, undefined);
});

// --- Task 2: a block drawn in a version

const toolsIn = (b: { cells: Cell[] }): PlanTool[] => b.cells.flatMap((c) => (c.type === "section" ? c.cells : [c])).flatMap((c) => (c.type === "tool" ? [c.tool] : []));
const text = (t: string): Cell => ({ type: "text", text: t });
const keysOfTools = (b: { cells: Cell[] }) => toolsIn(b).map((t) => (t as { key?: number }).key);
const bpmsOf = (b: { cells: Cell[] }) => toolsIn(b).map((t) => (t as { bpm?: number }).bpm);

test("applyGiven: the tools move to the key the selector is at; a pinned tool stays", () => {
  const b = { title: "{{=key}} minor pentatonic", moves: { key: "any" } as Moves, cells: [text("In {{=key}}, from {{1}} to {{c-sharp}}."), tool(band(60)), tool(neck()), tool(neck(A, { pinned: ["key"] }))] };
  const given = { keys: { now: [G, A], back: [] } };
  const g = applyGiven(b, given);
  assert.deepEqual(keysOfTools(g), [G, G, A]);
  assert.equal(g.title, "G minor pentatonic");
  assert.deepEqual(g.cells[0], text("In G, from {{1}} to {{c-sharp}}."), "the note dots are untouched");
  const a = applyGiven(b, given, { key: 1 });
  assert.deepEqual(keysOfTools(a), [A, A, A]);
  assert.equal(a.title, "A minor pentatonic");
  assert.deepEqual(keysOfTools(b), [A, A, A], "the block as written is untouched");
});

test("applyGiven: a tool in another key than the block's keeps its distance", () => {
  const b = { title: "t", moves: { key: "any" } as Moves, cells: [tool(band(60, A)), tool(neck(2))] };
  assert.deepEqual(keysOfTools(applyGiven(b, { keys: { now: [G], back: [] } })), [G, 0], "A to G is two down, so D becomes C");
});

test("applyGiven: a play-along's shape key is the block's written key, so its chords and key move to the given one", () => {
  const along = { type: "guitar-play-along", bpm: 70, shape: { shape: "chord-steps", key: "c", chords: [{ chord: "Dm7", steps: ["b3"] }, { chord: "G7", steps: ["b7"] }] } } as PlanTool;
  const b = { title: "Guide tones in {{=key}}", moves: { key: "any" } as Moves, cells: [tool(along)] };
  assert.equal(written(b).key, 0);
  const g = applyGiven(b, { keys: { now: [G], back: [] } });
  assert.equal(g.title, "Guide tones in G");
  const shape = (toolsIn(g)[0] as Extract<PlanTool, { type: "guitar-play-along" }>).shape as { key: string; chords: { chord: string }[] };
  assert.equal(shape.key, "g");
  assert.deepEqual(shape.chords.map((c) => c.chord), ["Am7", "D7"]);
});

test("applyGiven: chords in the title and headings are named in the key; text keeps its tokens for the reader", () => {
  const along = { type: "guitar-play-along", bpm: 70, shape: { shape: "chord-steps", key: "c", chords: [{ chord: "Dm7", steps: ["b3"] }] } } as PlanTool;
  const b = { title: "Guide tones through {{chord:ii7}} and {{chord:V7}}", moves: { key: "any" } as Moves, cells: [{ type: "section", heading: "From the 3rd of {{chord:ii7}}", cells: [text("The 3rd of {{chord:ii7}}."), tool(along)] } as Cell] };
  assert.equal(applyGiven(b, null).title, "Guide tones through Dm7 and G7");
  const g = applyGiven(b, { keys: { now: [G], back: [] } });
  assert.equal(g.title, "Guide tones through Am7 and D7");
  const s = g.cells[0];
  assert.ok(s.type === "section");
  assert.equal(s.heading, "From the 3rd of Am7");
  assert.deepEqual(s.cells[0], text("The 3rd of {{chord:ii7}}."));
  assert.deepEqual(paramWarnings({ ...b, moves: undefined }), ["a title or heading names {{chord:…}} but the block has no key move: name the chord in words there."]);
});

test("applyGiven: the tempo moves every tool by the distance from the start, in headings and lists too", () => {
  const b = {
    title: "Run", moves: { bpm: BPM } as Moves,
    cells: [
      { type: "section", heading: "Slowly, at {{=bpm}}", cells: [{ type: "list", items: ["Press Play: the click is at {{=bpm}}."] }, tool(band(60))] } as Cell,
      { type: "section", heading: "With the band", cells: [tool(band(80)), tool(band(100, A, { pinned: ["bpm"] }))] } as Cell,
    ],
  };
  const out = applyGiven(b, { bpm: { now: 70, back: [60] } });
  assert.deepEqual(bpmsOf(out), [70, 90, 100]);
  const first = out.cells[0];
  assert.ok(first.type === "section");
  assert.equal(first.heading, "Slowly, at 70");
  assert.deepEqual(first.cells[0], { type: "list", items: ["Press Play: the click is at 70."] });
  assert.deepEqual(bpmsOf(applyGiven(b, { bpm: { now: 70, back: [60] } }, { bpm: 1 })), [60, 80, 100], "the earlier tempo is the block as written");
});

test("applyGiven: a tool at the top of its tempo range stays there (Review Focus 5)", () => {
  const track = { type: "backing-track", progression: "x", key: A, bpm: 240 } as PlanTool;
  const b = { title: "t", moves: { bpm: { from: 60, to: 90, step: 10 } } as Moves, cells: [text("at {{=bpm}}"), tool(band(60, A, { pinned: ["bpm"] })), tool(band(60)), tool(track), tool({ type: "strum-along", chords: ["G"], bpm: 235 } as PlanTool)] };
  const out = applyGiven(b, { bpm: { now: 80, back: [] } });
  const bpms = bpmsOf(out);
  assert.equal(bpms[0], 60, "pinned");
  assert.equal(bpms[1], 80);
  assert.ok((bpms[2] as number) <= 240 && (bpms[3] as number) <= 240);
  assert.deepEqual(out.cells[0], text("at 80"), "the param reads the first tool that follows the tempo");
});

test("applyGiven: with nothing given the block is as written, its params filled from its tools (Review Focus 1)", () => {
  const b = { title: "{{=key}} run", moves: { key: "any", bpm: BPM } as Moves, cells: [text("at {{=bpm}}"), tool(band(60)), tool(neck())] };
  for (const given of [undefined, null, {}]) {
    const out = applyGiven(b, given);
    assert.deepEqual(toolsIn(out), toolsIn(b));
    assert.equal(out.title, "A run");
    assert.deepEqual(out.cells[0], text("at 60"));
  }
  assert.deepEqual(applyGiven(b, { bpm: { now: 70, back: [] } }, { bpm: 9 }).cells[0], text("at 70"), "an index past the values is the first");
});

test("applyGiven: a param with no value is left out, never shown raw; a block with no moves is returned as it is", () => {
  const b = { title: "t", moves: { key: "any" } as Moves, cells: [text("Play at {{=bpm}} now."), tool(neck())] };
  assert.deepEqual(applyGiven(b, null).cells[0], text("Play at now."));
  const plain = { title: "{{=key}}", cells: [tool(neck())] };
  assert.equal(applyGiven(plain, { keys: { now: [G], back: [] } }), plain);
});

test("applyGiven: a {{?key}} line is drawn only when the Key selector is, with the mark taken off", () => {
  const b = { title: "t", moves: { key: "any" } as Moves, cells: [text("Sing the skips.\n{{?key}}In another key each skip is the same distance.\nThen stop."), tool(neck())] };
  assert.deepEqual(applyGiven(b, null).cells[0], text("Sing the skips.\nThen stop."), "nothing given: no selector, no line");
  assert.deepEqual(applyGiven(b, { keys: { now: [G], back: [] } }).cells[0], text("Sing the skips.\nThen stop."), "one key: no selector");
  assert.deepEqual(applyGiven(b, { keys: { now: [G, 9], back: [] } }).cells[0], text("Sing the skips.\nIn another key each skip is the same distance.\nThen stop."));
  const plain = { title: "t", cells: [text("Play.\n{{?bpm}}At another tempo the count is the same."), tool(neck())] };
  assert.deepEqual(applyGiven(plain, null).cells[0], text("Play."), "a block with no moves never shows the line or its mark");
  assert.deepEqual(paramWarnings(plain), ["text names {{=bpm}} or {{?bpm}} but the block has no tempo move."]);
});

test("selectorsOf: chips only for a part with more than one value, now first", () => {
  const b = { moves: { key: "any", bpm: BPM } as Moves };
  assert.deepEqual(selectorsOf(b, { bpm: { now: 70, back: [60] }, keys: { now: [A], back: [] } }), [{ part: "bpm", values: [70, 60], back: 1 }]);
  assert.deepEqual(selectorsOf(b, { keys: { now: [G, A], back: [4] }, bpm: { now: 60, back: [] } }), [{ part: "key", values: [G, A, 4], back: 2 }]);
  assert.deepEqual(selectorsOf(b, { keys: { now: [G, A], back: [] } }), [{ part: "key", values: [G, A], back: 2 }]);
  assert.deepEqual(selectorsOf(b, null), []);
  assert.deepEqual(selectorsOf({}, { bpm: { now: 70, back: [60] } }), []);
});

test("written: the key and tempo of the first tools that follow them", () => {
  assert.deepEqual(written({ cells: [tool({ type: "note-finder" } as PlanTool), tool(neck(G)), tool(band(80, A))] }), { key: G, bpm: 80 });
  assert.deepEqual(written({ cells: [text("x")] }), { key: null, bpm: null });
});

test("paramWarnings: a param needs its move", () => {
  assert.deepEqual(paramWarnings({ title: "{{=key}} run", moves: { bpm: BPM }, cells: [text("at {{=bpm}}"), tool(band(60))] }), ["text names {{=key}} or {{?key}} but the block has no key move."]);
  assert.deepEqual(paramWarnings({ title: "Run", cells: [{ type: "section", heading: "At {{=bpm}}", cells: [tool(band(60))] } as Cell] }), ["text names {{=bpm}} or {{?bpm}} but the block has no tempo move."]);
  assert.deepEqual(paramWarnings({ title: "Run", moves: { bpm: BPM }, cells: [text("at {{=bpm}}"), tool(band(60))] }), []);
});

// --- Task 5: a rating keeps its version, and a hard moved version doesn't lower the step

test("scoringRows: only a play found hard in a version past the first is left out", () => {
  const rows = [{ stars: 2, given: { moved: 1 } }, { stars: 2 }, { stars: 2, given: { moved: 0 } }, { stars: 3, given: { moved: 2 } }, { stars: 1, given: { moved: 4 } }];
  assert.deepEqual(scoringRows(rows), [{ stars: 2 }, { stars: 2, given: { moved: 0 } }, { stars: 3, given: { moved: 2 } }]);
});

const P1 = "pentatonic-positions:1";
const rated = (id: string, stars: number, at: string, given?: ProgressEntry["given"]): ProgressEntry =>
  ({ id, planId: "p", exerciseId: `e-${id}`, day: 0, exercise: 0, title: "Position 1", area: "guitar", level: "beginner", topic: "guitar-scales", concepts: ["pentatonic-positions"], steps: [P1], blockId: "b", stars, at, ...(given ? { given } : {}) }) as ProgressEntry;

test("a step stays solid when a harder version of its block was found hard", () => {
  const easy = [rated("1", 5, "2026-11-10T10:00:00.000Z"), rated("2", 5, "2026-11-11T10:00:00.000Z")];
  const hard = rated("3", 1, "2026-11-12T10:00:00.000Z", { bpm: { now: 70, back: [60] }, moved: 1 });
  assert.deepEqual(solidRatedAt([...easy, hard]), solidRatedAt(easy));
  const o = (entries: ProgressEntry[]) => outcome({ plans: [], entries, times: [], answersHistory: [] }, "2026-11-19");
  const topics = (entries: ProgressEntry[]) => o(entries).areas.flatMap((a) => a.topics.map((t) => ({ topic: t.topic, score: t.score, concepts: t.concepts.map((c) => ({ id: c.id, state: c.state })) })));
  assert.deepEqual(topics([...easy, hard]), topics(easy));
  assert.equal(o([...easy, hard]).areas.find((a) => a.area === "guitar")!.ratings, 3, "the rating is still counted as a rating");
  const first = rated("3", 1, "2026-11-12T10:00:00.000Z", { bpm: { now: 60, back: [] } });
  assert.notDeepEqual(topics([...easy, first]), topics(easy), "found hard in the first version, it counts as today");
});

test("entryFor: the row carries the version the exercise was played in", () => {
  const given = { keys: { now: [G, A], back: [] }, bpm: { now: 70, back: [60] }, moved: 2 };
  const plan = { id: "p", startedOn: "2026-11-19", done: {}, config: { title: "t", days: [{ theme: "", exercises: [{ ...ex({ moves: { key: "any", bpm: BPM }, given }), id: "s1" }, { ...ex(), id: "s2" }] }] } };
  const at = "2026-11-19T10:00:00.000Z";
  assert.deepEqual(entryFor(plan as never, 0, 0, { stars: 5, at }, () => "n")!.given, given);
  assert.equal("given" in entryFor(plan as never, 0, 1, { stars: 5, at }, () => "n")!, false);
});
