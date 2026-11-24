import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEED_BLOCKS } from "@/features/library/seed";
import { GENRES } from "@/features/library/seed/genres";
import { columnsOf } from "@/features/exercises/riffs/riff";
import { blockFileText, checkEdit, riffBlockOf, withRiff, type RiffBlock } from "./blocks";

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

  it("checkEdit refuses what can't be a riff", () => {
    const ok = { tonic: 9, scale: "Aeolian", bpm: 90, notes: [{ string: 0, fret: 5, beats: 1 }] };
    assert.deepEqual(checkEdit(ok), []);
    assert.equal(checkEdit({ ...ok, tonic: 12 }).length, 1);
    assert.equal(checkEdit({ ...ok, bpm: 20 }).length, 1);
    assert.equal(checkEdit({ ...ok, notes: [] }).length, 1);
    assert.equal(checkEdit({ ...ok, notes: [{ string: 0, fret: 30, beats: 1 }] }).length, 1);
  });
});
