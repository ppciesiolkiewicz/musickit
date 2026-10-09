import assert from "node:assert/strict";
import { test } from "node:test";
import { addInstrument, addSample, clearPad, emptyProject, guessNote, movePad, nextFreeNote, removeSample, sanitiseProject, setPad, uniqueId } from "./project";
import type { SampleMeta } from "./types";

const sample = (id: string): SampleMeta => ({ id, name: id, source: "upload", mime: "audio/wav", bytes: 1, createdAt: 1 });
const base = () => addInstrument(addSample(addSample(emptyProject(), sample("a")), sample("b")), "Kit", "i1");

test("pads hold samples on valid notes only", () => {
  let p = setPad(base(), "i1", "C3", "a");
  assert.deepEqual(p.instruments[0].pads, { C3: "a" });
  assert.equal(setPad(p, "i1", "H9", "a"), p);
  assert.equal(setPad(p, "i1", "D3", "missing"), p);
  p = clearPad(p, "i1", "C3");
  assert.deepEqual(p.instruments[0].pads, {});
});

test("removing a sample removes its pads", () => {
  let p = setPad(setPad(base(), "i1", "C3", "a"), "i1", "D3", "b");
  p = removeSample(p, "a");
  assert.deepEqual(p.instruments[0].pads, { D3: "b" });
  assert.equal(p.samples.length, 1);
});

test("moving a pad swaps with a taken note", () => {
  const p = setPad(setPad(base(), "i1", "C3", "a"), "i1", "D3", "b");
  assert.deepEqual(movePad(p, "i1", "C3", "D3").instruments[0].pads, { C3: "b", D3: "a" });
  assert.deepEqual(movePad(p, "i1", "C3", "E3").instruments[0].pads, { D3: "b", E3: "a" });
});

test("sanitise drops junk, duplicates and dangling pads", () => {
  const p = sanitiseProject({
    samples: [sample("a"), sample("a"), null, { id: 5 }],
    instruments: [{ id: "i", label: "  ", pads: { C3: "a", D3: "zzz", nope: "a" }, attack: 99, release: -1 }, { id: "i" }],
  });
  assert.equal(p.samples.length, 1);
  assert.equal(p.instruments.length, 1);
  assert.deepEqual(p.instruments[0].pads, { C3: "a" });
  assert.equal(p.instruments[0].label, "Instrument");
  assert.equal(p.instruments[0].attack, 2);
  assert.equal(p.instruments[0].release, 0.02);
  assert.deepEqual(sanitiseProject("garbage"), emptyProject());
});

test("guessNote reads a note from a file name", () => {
  assert.equal(guessNote("pad_F#3.wav"), "F#3");
  assert.equal(guessNote("Strings Bb2 long.mp3"), "Bb2");
  assert.equal(guessNote("kick.wav"), null);
  assert.equal(guessNote("Bass_a1.wav"), "A1");
});

test("nextFreeNote and uniqueId", () => {
  assert.equal(nextFreeNote({ C3: "a", "C#3": "b" }), "D3");
  const first = uniqueId("x", [], () => 0.5);
  let n = 0;
  const second = uniqueId("x", [first], () => (n++ ? 0.25 : 0.5));
  assert.notEqual(second, first);
});
