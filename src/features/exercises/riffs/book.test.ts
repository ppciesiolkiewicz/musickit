import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { stepAt } from "@/features/plan/model/path";
import { expandShape } from "../shapes";
import { FILES } from "./book/index.gen";
import { RIFFS, checkNotes, checkRiff, findRiff, riffFileText } from "./book";
import { columnsOf } from "./riff";

describe("the riff book", () => {
  it("every file is a sound riff under its own name, written as the riff maker writes it", () => {
    for (const [name, raw] of Object.entries(FILES)) {
      assert.deepEqual(checkRiff(raw, name), [], name);
      const text = readFileSync(path.join("src/features/exercises/riffs/book", `${name}.json`), "utf8");
      assert.equal(text, riffFileText(findRiff(name)!), name);
    }
  });

  it("every riff hangs off steps the path has", () => {
    for (const r of RIFFS) for (const s of r.steps) assert.ok(stepAt(s), `${r.id}: ${s}`);
  });

  it("a written riff fills whole bars and plays through the riff shape; an empty one does not expand", () => {
    for (const r of RIFFS) {
      const t = expandShape({ shape: "riff", riff: r.id });
      if (!r.notes.length) { assert.equal(t, null, r.id); continue; }
      const beats = columnsOf(r.notes).reduce((a, c) => a + c.beats, 0);
      assert.equal(beats % 4, 0, `${r.id}: ${beats} beats`);
      assert.ok(t, r.id);
      assert.equal(t.bars, beats / 4, r.id);
      assert.equal(t.bpm, r.bpm, r.id);
    }
  });

  it("the riff shape takes a tempo and refuses an unknown riff", () => {
    assert.equal(expandShape({ shape: "riff", riff: "rock-power-chords-on-two-roots", bpm: 70 })?.bpm, 70);
    assert.equal(expandShape({ shape: "riff", riff: "no-such-riff" }), null);
  });

  it("the rock riff: two power chords, each struck twice, then single notes on the D string", () => {
    const t = expandShape({ shape: "riff", riff: "rock-power-chords-on-two-roots" })!;
    const steps = t.events.filter((e) => e.type === "step");
    assert.equal(steps.length, 12);
    // A5 with its root on the low E string: A and the E a 5th above, counted from the A an octave higher (`melodyTonic`)
    assert.deepEqual(steps[0].step, { kind: "grip", semis: [-12, -5], strings: [6, 5], from: "key", fret: 6 });
    // D5 with its root on the A string
    assert.deepEqual(steps[6].step, { kind: "grip", semis: [-7, 0], strings: [5, 4], from: "key", fret: 6 });
    // A, C, G, A on the D string: the root, the flat 3rd, the flat 7th, the root
    assert.deepEqual(steps.slice(2, 6).map((e) => e.step.kind === "note" && [e.step.semis, e.step.string]), [[0, 4], [3, 4], [-2, 4], [0, 4]]);
  });

  it("checkNotes refuses what the riff maker can't write", () => {
    assert.deepEqual(checkNotes([{ string: 0, fret: 5, beats: 1 }, { string: null, fret: null, beats: 0.5 }]), []);
    assert.equal(checkNotes([{ string: 6, fret: 5, beats: 1 }]).length, 1);
    assert.equal(checkNotes([{ string: 0, fret: 5, beats: 0.3 }]).length, 1);
    assert.equal(checkNotes([{ string: 0, fret: 5, beats: 1, with: true }]).length, 1);
    assert.equal(checkNotes("x").length, 1);
  });
});
