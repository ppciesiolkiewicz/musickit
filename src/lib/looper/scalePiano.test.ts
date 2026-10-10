import { test } from "node:test";
import assert from "node:assert/strict";
import { ScalePiano, clampState, type NoteVoice } from "./scalePiano";

const fakeCtx = () => ({ createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }) }) as unknown as AudioContext;

test("state is clamped and old saves get the piano sound", () => {
  assert.deepEqual(clampState({ root: 14, scale: "", octave: 99 }), { root: 2, scale: "major", octave: 6, instrument: "PIANO" });
  assert.equal(clampState({ instrument: "ELEC_PIANO" }).instrument, "ELEC_PIANO");
  assert.equal(clampState({ instrument: 5 as unknown as string }).instrument, "PIANO");
});

test("the chosen sound reaches the voice: on attach, on load and when it changes", () => {
  const calls: string[] = [];
  const voice: NoteVoice = { noteOn() {}, noteOff() {}, allOff() {}, setInstrument: (id) => calls.push(id), preload: () => Promise.resolve() };
  const p = new ScalePiano("p1", () => undefined, () => voice);
  p.attach(fakeCtx());
  p.load({ instrument: "FLUTE" });
  p.set({ root: 2 });
  p.set({ instrument: "CELLO" });
  assert.deepEqual(calls, ["PIANO", "FLUTE", "CELLO"]);
  assert.equal(p.serialize().instrument, "CELLO");
});
