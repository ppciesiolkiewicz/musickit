import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMP_PATTERNS, compEvents } from "./comping";

const chord = [45, 52, 57, 61, 64];

describe("compEvents", () => {
  it("every pattern fills a 4/4 bar inside the bar", () => {
    for (const p of COMP_PATTERNS) {
      const ev = compEvents(chord, p.id);
      assert.ok(ev.length > 0, p.id);
      for (const e of ev) {
        assert.ok(e.beat >= 0 && e.beat < 4, `${p.id} beat ${e.beat}`);
        assert.ok(e.midi.every((m) => chord.includes(m)), p.id);
      }
    }
  });
  it("arpeggio up climbs the chord in eighths", () => {
    const ev = compEvents(chord, "arp-up");
    assert.equal(ev.length, 8);
    assert.deepEqual(ev.slice(0, 6).map((e) => e.midi[0]), [45, 52, 57, 61, 64, 45]);
    assert.equal(ev[1].beat, 0.5);
  });
  it("arpeggio up and down turns without repeating the ends", () => {
    assert.deepEqual(compEvents([1, 2, 3], "arp-updown", 2).map((e) => e.midi[0]), [1, 2, 3, 2]);
  });
  it("bass + chord alternates the bass with the upper notes", () => {
    const ev = compEvents(chord, "bass-chord");
    assert.deepEqual(ev[0].midi, [45]);
    assert.deepEqual(ev[1].midi, chord.slice(1));
  });
  it("no notes, no events", () => assert.deepEqual(compEvents([], "block"), []));
});
