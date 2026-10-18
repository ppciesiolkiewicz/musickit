import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PENTATONICS, findPentatonic, pentatonicContext, pentatonicSteps, samePentatonicNotes } from "./pentatonics";
import { boxesFor, pentatonicPositions } from "../../lib/chordKit/scalePositions";

const P = (slug: string) => findPentatonic(slug)!;

describe("pentatonic scales", () => {
  it("spell their five notes from the host mode", () => {
    assert.deepEqual(pentatonicContext(0, P("major-pentatonic")).names, ["C", "D", "E", "G", "A"]);
    assert.deepEqual(pentatonicContext(9, P("minor-pentatonic")).names, ["A", "C", "D", "E", "G"]);
    assert.deepEqual(pentatonicContext(4, P("in-scale")).names, ["E", "F", "A", "B", "C"]);
    assert.deepEqual(pentatonicContext(4, P("hirajoshi")).formula, ["R", "2", "♭3", "5", "♭6"]);
    assert.deepEqual(pentatonicContext(0, P("suspended-pentatonic")).formula, ["R", "2", "4", "5", "♭7"]);
  });

  it("have five notes, distinct slugs and steps that add up to an octave", () => {
    assert.equal(new Set(PENTATONICS.map((p) => p.slug)).size, PENTATONICS.length);
    for (const p of PENTATONICS) {
      const ctx = pentatonicContext(0, p);
      assert.equal(new Set(ctx.steps).size, 5, p.slug);
      assert.equal(ctx.steps[0], 0, p.slug);
    }
    assert.deepEqual(pentatonicSteps(pentatonicContext(0, P("major-pentatonic")).steps), ["W", "W", "W+H", "W", "W+H"]);
  });

  it("C major pentatonic shares its notes with A minor, D suspended, E man gong and G ritusen", () => {
    const same = samePentatonicNotes(0, P("major-pentatonic")).map((s) => `${s.tonicPc} ${s.scale.slug}`);
    assert.deepEqual(same.sort(), ["2 suspended-pentatonic", "4 man-gong", "7 ritusen", "9 minor-pentatonic"]);
  });

  it("the five rotations of the major pentatonic use its boxes; the Japanese scales two notes per string", () => {
    const boxed = PENTATONICS.filter((p) => pentatonicPositions(pentatonicContext(0, p).host, p.degrees).boxes).map((p) => p.slug);
    assert.deepEqual(boxed, ["major-pentatonic", "minor-pentatonic", "suspended-pentatonic", "man-gong", "ritusen"]);
  });

  it("A minor pentatonic keeps the classic boxes of the Aeolian page", () => {
    const ctx = pentatonicContext(9, P("minor-pentatonic"));
    assert.deepEqual(pentatonicPositions(ctx.host, ctx.degrees).positions, boxesFor(ctx.host, [0, 2, 3, 4, 6]));
  });

  it("five positions of its own notes, two per string within four frets (except the open boxes in E), in every key", () => {
    for (const p of PENTATONICS) for (let pc = 0; pc < 12; pc++) {
      const ctx = pentatonicContext(pc, p);
      const { positions } = pentatonicPositions(ctx.host, p.degrees);
      assert.equal(positions.length, 5);
      positions.forEach((b) => {
        assert.ok(b.notes.every((n) => p.degrees.includes(n.degree) && n.fret >= 0 && n.fret <= 17), `${p.slug} ${pc} position ${b.number}`);
        if (b.from === 0 || b.to >= 17) return;
        for (let s = 0; s < 6; s++) {
          const fr = b.notes.filter((n) => n.string === s).map((n) => n.fret);
          assert.equal(fr.length, 2, `${p.slug} ${pc} position ${b.number} string ${s}: ${fr}`);
          assert.ok(fr[1] - fr[0] <= 4, `${p.slug} ${pc} position ${b.number} string ${s}: ${fr}`);
        }
      });
    }
  });
});
