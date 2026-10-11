import { test } from "node:test";
import assert from "node:assert/strict";
import { InstrumentInput, type NoteVoice } from "./instrument";
import { PAD_BASE, type VoiceSpec } from "./instrumentModel";

const fakeCtx = () => ({ createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }) }) as unknown as AudioContext;

function recorder() {
  const log: string[] = [];
  const specs: VoiceSpec[] = [];
  let made: VoiceSpec | null = null;
  const voice: NoteVoice = {
    noteOn: (m) => log.push(`on ${m}`),
    noteOff: (m) => log.push(`off ${m}`),
    allOff: () => log.push("all off"),
    setSound: (s) => specs.push(s),
    preload: () => Promise.resolve(),
    dispose: () => log.push("dispose"),
  };
  return { log, specs, made: () => made, factory: (_c: AudioContext, _d: AudioNode, s: VoiceSpec) => ((made = s), voice) };
}

test("the voice is made with the sound, and told again only when the sound changes", () => {
  const r = recorder();
  const p = new InstrumentInput("p1", () => undefined, r.factory);
  p.load({ controller: "scalepiano", generator: { kind: "piano", instrument: "FLUTE" } });
  p.attach(fakeCtx());
  assert.deepEqual(r.made(), { kind: "piano", instrument: "FLUTE" });
  p.set({ root: 2 });
  assert.deepEqual(r.specs, []);
  p.set({ generator: { kind: "piano", instrument: "CELLO", padNotes: [] } });
  assert.deepEqual(r.specs, [{ kind: "piano", instrument: "CELLO" }]);
  const g = p.serialize().generator;
  assert.equal(g.kind === "piano" && g.padNotes.length, 8);
});

test("a Soundboard on a piano plays each pad's note; pads past the count are silent", () => {
  const r = recorder();
  const p = new InstrumentInput("p1", () => undefined, r.factory);
  p.load({ controller: "soundboard", pads: 2, generator: { kind: "piano", instrument: "PIANO", padNotes: [50, 70] } });
  p.attach(fakeCtx());
  p.noteOn(PAD_BASE + 1, 0.5);
  p.noteOff(PAD_BASE + 1);
  p.noteOn(PAD_BASE + 5);
  assert.deepEqual(r.log, ["on 70", "off 70"]);
});

test("changes stop held notes and are reported; dispose lets go of the voice", () => {
  const r = recorder();
  let changes = 0;
  const p = new InstrumentInput("p1", () => changes++, r.factory);
  p.attach(fakeCtx());
  p.set({ octave: 4 });
  assert.equal(changes, 1);
  assert.ok(r.log.includes("all off"));
  p.dispose();
  assert.equal(r.log.at(-1), "dispose");
  assert.equal(p.out, null);
});

test("without a voice it is silent and does not throw", () => {
  const p = new InstrumentInput("p1", () => undefined);
  p.attach(fakeCtx());
  p.noteOn(60);
  p.set({ controller: "soundboard" });
  assert.equal(p.state.controller, "soundboard");
});
