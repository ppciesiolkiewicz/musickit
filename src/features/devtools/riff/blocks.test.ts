import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEED_BLOCKS } from "@/features/library/seed";
import { GENRES } from "@/features/library/seed/genres";
import { columnsOf } from "@/features/exercises/riffs/riff";
import { toolCells } from "@/features/contentVideos/model/slot";
import type { Cell } from "@/features/plan/model/tools";
import { blockFileText, checkEdit, keptRiff, riffBlockOf, riffInFile, riffsOf, withRiff, type RiffBlock } from "./blocks";

const riffs = SEED_BLOCKS.flatMap((f) => { const r = riffBlockOf(f); return r ? [{ f, r }] : []; });

describe("the seed blocks that hold a riff", () => {
  it("are found, each with a riff that reads, a genre and whole bars", () => {
    assert.ok(riffs.length >= 8);
    for (const { f, r } of riffs) {
      assert.ok(!("error" in r), `${f.id}: ${"error" in r ? r.error : ""}`);
      const b = r as RiffBlock;
      assert.ok(b.genre && GENRES.includes(b.genre), `${f.id} has no genre`);
      assert.ok(b.steps.length, `${f.id} names no step`);
      const beats = columnsOf(b.notes).reduce((a, c) => a + c.beats, 0);
      assert.equal(beats % 4, 0, `${f.id}: ${beats} beats`);
    }
    assert.equal(riffBlockOf(SEED_BLOCKS.find((f) => f.id === "guitar-intermediate-palm-muted-power-chords")), null);
  });

  it("saving a riff unchanged leaves its file as it is", () => {
    for (const { f, r } of riffs) {
      const b = r as RiffBlock;
      const text = readFileSync(`src/features/library/seed/blocks/${f.id}.json`, "utf8");
      assert.equal(blockFileText(withRiff(JSON.parse(text), b)), text, f.id);
    }
  });

  it("a save writes the key, scale, notes and tempo, moves the tempo range with it, and keeps the words", () => {
    const { f } = riffs.find((x) => x.f.id === "guitar-beginner-rock-power-chords-and-a-riff")!;
    const before = riffBlockOf(f) as RiffBlock;
    const next = withRiff(f, { tonic: 4, scale: "Dorian", bpm: before.bpm + 10, notes: before.notes.slice(0, 2) })!;
    const after = riffBlockOf(next) as RiffBlock;
    assert.deepEqual([after.tonic, after.scale, after.bpm, after.notes.length], [4, "Dorian", before.bpm + 10, 2]);
    const moves = (next.choices as { moves: { bpm: { from: number; to: number } } }[])[0].moves.bpm;
    const was = (f.choices[0].moves as { bpm: { from: number; to: number } }).bpm;
    assert.deepEqual([moves.from, moves.to], [was.from + 10, was.to + 10]);
    assert.equal((next.exercise as { why: string }).why, f.exercise.why);
    assert.equal(after.draft, true);
    // the file given is not changed
    assert.equal((riffBlockOf(f) as RiffBlock).tonic, before.tonic);
  });

  it("an amp is set right after the genre, kept when the edit leaves it out, and taken out with null", () => {
    const { f } = riffs.find((x) => x.f.id === "guitar-beginner-rock-power-chords-and-a-riff")!;
    const b = riffBlockOf(f) as RiffBlock;
    const edit = { tonic: b.tonic, scale: b.scale, bpm: b.bpm, notes: b.notes };
    const set = withRiff(f, { ...edit, amp: "Some Amp Crunch" })!;
    assert.equal((riffBlockOf(set) as RiffBlock).amp, "Some Amp Crunch");
    const keys = Object.keys(set);
    assert.equal(keys[keys.indexOf("genre") + 1], "amp");
    assert.equal((riffBlockOf(withRiff(set, edit)!) as RiffBlock).amp, "Some Amp Crunch");
    const gone = withRiff(set, { ...edit, amp: null })!;
    assert.equal("amp" in gone, false);
    assert.equal((riffBlockOf(gone) as RiffBlock).amp, null);
  });

  it("checkEdit refuses what can't be a riff", () => {
    const ok = { tonic: 9, scale: "Aeolian", bpm: 90, notes: [{ string: 0, fret: 5, beats: 1 }] };
    assert.deepEqual(checkEdit(ok), []);
    assert.equal(checkEdit({ ...ok, tonic: 12 }).length, 1);
    assert.equal(checkEdit({ ...ok, bpm: 20 }).length, 1);
    assert.equal(checkEdit({ ...ok, notes: [] }).length, 1);
    assert.equal(checkEdit({ ...ok, notes: [{ string: 0, fret: 30, beats: 1 }] }).length, 1);
    assert.deepEqual(checkEdit({ ...ok, amp: null }), []);
    assert.deepEqual(checkEdit({ ...ok, amp: "Tim R JCM2000 Crunch" }), []);
    assert.equal(checkEdit({ ...ok, amp: " " }).length, 1);
    assert.equal(checkEdit({ ...ok, amp: 3 }).length, 1);
  });
});

describe("riffsOf", () => {
  it("lists the riffs of bundled seed blocks", () => {
    const out = riffsOf(SEED_BLOCKS);
    assert.deepEqual(out.riffs.map((r) => r.id), riffs.map((x) => x.f.id).sort((a, b) => a.localeCompare(b)));
    assert.deepEqual(out.problems, []);
  });

  it("puts a block whose riff can't be read in problems, by id", () => {
    const { f } = riffs[0];
    const out = riffsOf([JSON.parse(JSON.stringify(f).replace(/"key":"[^"]*"/, '"key":"nope"')), "junk"]);
    assert.equal(out.problems.length, 1);
    assert.match(out.problems[0], new RegExp(`^${f.id}: `));
    assert.deepEqual(out.riffs, []);
  });
});

describe("a riff block's tool cell", () => {
  const real = SEED_BLOCKS.find((f) => f.id === "guitar-beginner-rock-power-chords-and-a-riff")!;
  const riffCell = (real.exercise.cells as { type: string }[]).find((c) => c.type === "tool")!;
  const other = { type: "tool", tool: { type: "metronome", bpm: 60 } };

  it("a riff block says which tool cell its riff is", () => {
    assert.equal((riffBlockOf(real) as RiffBlock).cell, 0);
    // a tool before the riff's play-along
    const before = { ...real, exercise: { ...real.exercise, cells: [{ type: "text", text: "a" }, other, riffCell] } };
    assert.equal((riffBlockOf(before) as RiffBlock).cell, 1);
    // a riff inside a section counts through the tools before it, a section's among them
    const inSection = { ...real, exercise: { ...real.exercise, cells: [other, { type: "section", heading: "One", cells: [other, { type: "text", text: "b" }] }, { type: "section", heading: "Two", cells: [riffCell] }] } };
    assert.equal((riffBlockOf(inSection) as RiffBlock).cell, 2);
  });

  it("counts the same as toolCells on every seed riff", () => {
    for (const { f, r } of riffs) {
      const tools = toolCells(f.exercise.cells as Cell[]);
      const at = (r as RiffBlock).cell;
      assert.equal(tools[at]?.type, "guitar-play-along", f.id);
      assert.equal(tools.findIndex((t) => t.type === "guitar-play-along" && t.shape.shape === "riff"), at, f.id);
    }
  });
});

describe("a riff saved in the app", () => {
  const { f } = riffs.find((x) => x.f.id === "guitar-beginner-rock-power-chords-and-a-riff")!;
  const b = riffBlockOf(f) as RiffBlock;
  const same = { tonic: b.tonic, scale: b.scale, bpm: b.bpm, notes: b.notes, amp: b.amp };

  it("is laid over the file's riff, and the file's own riff counts as in the file", () => {
    assert.equal(riffInFile(f, same), true);
    const edit = { ...same, tonic: (b.tonic + 2) % 12 };
    const kept = keptRiff(f, edit)!;
    assert.equal((riffBlockOf(kept) as RiffBlock).tonic, (b.tonic + 2) % 12);
    assert.equal(riffInFile(f, edit), false);
    assert.equal(riffInFile(kept, edit), true);
  });

  it("is not kept when it doesn't read", () => {
    assert.equal(keptRiff(f, { ...same, bpm: 999 }), null);
    assert.equal(keptRiff(f, "notes"), null);
    assert.equal(riffInFile(f, null), false);
  });
});
