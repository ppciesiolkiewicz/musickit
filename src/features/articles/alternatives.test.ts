import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shapeFromFrets } from "@/features/exercises/cues/voicing";
import { barreAlternatives } from "./alternatives";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

describe("barreAlternatives", () => {
  it("gives every major and minor chord stand-ins the chord boxes can draw, holding only that chord's notes", () => {
    for (const r of ROOTS)
      for (const q of [r, `${r}m`]) {
        const res = barreAlternatives(q);
        assert.ok(res.ok, q);
        assert.ok(res.items.length >= 2, q);
        for (const it of res.items) {
          assert.ok(shapeFromFrets(it.chord, it.frets), `${q}: ${it.title} ${it.chord} ${it.frets}`);
          assert.ok(it.frets.split(" ").every((f) => f === "x" || (Number(f) >= 0 && Number(f) <= 15)), `${q}: ${it.frets}`);
        }
      }
  });

  it("matches the article's shapes", () => {
    const bm = barreAlternatives("Bm");
    assert.ok(bm.ok);
    assert.equal(bm.items.find((i) => i.title === "Four strings")?.frets, "x x 4 4 3 2");
    const f = barreAlternatives("F");
    assert.ok(f.ok);
    assert.equal(f.items.find((i) => i.title === "Three strings in the middle")?.frets, "x x 3 2 1 x");
    assert.equal(f.items.find((i) => i.title === "Top three strings")?.frets, "x x x 2 1 1");
    assert.equal(f.items.find((i) => i.title === "maj7, root on the low E")?.frets, "1 x 2 2 1 x");
    assert.equal(barreAlternatives("C").ok && barreAlternatives("C")?.ok, true);
  });

  it("says why when it has nothing", () => {
    assert.deepEqual(barreAlternatives(" "), { ok: false, reason: "empty" });
    assert.deepEqual(barreAlternatives("hello"), { ok: false, reason: "unknown" });
    assert.deepEqual(barreAlternatives("G7"), { ok: false, reason: "type" });
  });
});
