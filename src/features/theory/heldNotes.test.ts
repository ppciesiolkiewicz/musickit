import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHeldNotes } from "./heldNotes";

/** readings every 10 ms from `from` to `to` (exclusive) at `midi` */
const feed = (h: ReturnType<typeof createHeldNotes>, from: number, to: number, midi: number | null) => {
  for (let t = from; t < to; t += 10) h.push(t, midi);
};

describe("held notes", () => {
  it("a note shows once the pitch has stayed on one key for 100 ms", () => {
    const h = createHeldNotes();
    feed(h, 0, 100, 60.1);
    assert.equal(h.notes().length, 0);
    feed(h, 100, 120, 60.1);
    const [n] = h.notes();
    assert.equal(n.midi, 60);
    assert.equal(n.start, 0);
    assert.equal(n.live, true);
    assert.ok(Math.abs(n.meanCents - 10) < 1e-9);
  });

  it("anything within Easy's 40 cents counts, further off does not", () => {
    const h = createHeldNotes();
    feed(h, 0, 200, 60.45);
    assert.equal(h.notes().length, 0);
    feed(h, 200, 400, 60.38);
    assert.equal(h.notes()[0].midi, 60);
  });

  it("a short wobble off the key doesn't end the note; a longer one does", () => {
    const h = createHeldNotes();
    feed(h, 0, 200, 60);
    feed(h, 200, 260, null);
    feed(h, 260, 400, 60);
    assert.equal(h.notes().length, 1);
    feed(h, 400, 600, null);
    feed(h, 600, 800, 60);
    const ns = h.notes();
    assert.equal(ns.length, 2);
    assert.equal(ns[0].live, false);
    assert.equal(ns[0].end, 390);
    assert.equal(ns[1].live, true);
  });

  it("moving to another key ends the note at once; a slide through keys leaves nothing", () => {
    const h = createHeldNotes();
    feed(h, 0, 200, 60);
    for (let k = 0; k < 4; k++) feed(h, 200 + k * 30, 230 + k * 30, 61 + k);
    feed(h, 320, 500, 65);
    assert.deepEqual(h.notes().map((n) => n.midi), [60, 65]);
  });

  it("prunes notes that ended before a time", () => {
    const h = createHeldNotes();
    feed(h, 0, 200, 60);
    feed(h, 200, 400, 62);
    h.prune(300);
    assert.deepEqual(h.notes().map((n) => n.midi), [62]);
  });
});
