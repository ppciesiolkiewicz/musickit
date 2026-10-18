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

  it("have five notes (six with a blue note), distinct slugs and steps that climb from the root", () => {
    assert.equal(new Set(PENTATONICS.map((p) => p.slug)).size, PENTATONICS.length);
    for (const p of PENTATONICS) {
      const ctx = pentatonicContext(0, p);
      assert.equal(new Set(ctx.steps).size, p.blue ? 6 : 5, p.slug);
      assert.deepEqual(ctx.steps, [...ctx.steps].sort((a, b) => a - b), p.slug);
      assert.equal(ctx.steps[0], 0, p.slug);
    }
    assert.deepEqual(pentatonicSteps(pentatonicContext(0, P("major-pentatonic")).steps), ["W", "W", "W+H", "W", "W+H"]);
  });

  it("the blues scale is minor pentatonic with a ♯4, spelled on the 4th's letter in every key", () => {
    const a = pentatonicContext(9, P("minor-blues"));
    assert.deepEqual(a.names, ["A", "C", "D", "D♯", "E", "G"]);
    assert.deepEqual(a.formula, ["R", "♭3", "4", "♯4", "5", "♭7"]);
    assert.deepEqual(a.tones.map((t) => t.degree), [0, 2, 3, 3, 4, 6]);
    assert.deepEqual(pentatonicContext(3, P("minor-blues")).names, ["E♭", "G♭", "A♭", "A", "B♭", "D♭"]);
    assert.deepEqual(pentatonicContext(11, P("minor-blues")).names, ["B", "D", "E", "E♯", "F♯", "A"]);
    assert.equal(new Set(a.tones.map((t) => t.key)).size, 6);
    assert.deepEqual(samePentatonicNotes(9, P("minor-blues")), []);
  });

  it("A blues box 1 is minor pentatonic box 1 with D♯ on the A string (6th fret) and the G string (8th)", () => {
    const a = pentatonicContext(9, P("minor-blues"));
    const t = a.tones.find((x) => x.blue)!;
    const [box1] = pentatonicPositions(a.host, a.degrees, { degree: t.degree, semi: t.semis, name: t.name, degreeText: t.label }).positions;
    const blues = box1.notes.filter((n) => n.name === "D♯").map((n) => [n.string, n.fret]);
    assert.deepEqual(blues, [[1, 6], [3, 8]]);
    assert.equal(box1.notes.length, 14);
  });

  it("C major pentatonic shares its notes with A minor, D suspended, E man gong and G ritusen", () => {
    const same = samePentatonicNotes(0, P("major-pentatonic")).map((s) => `${s.tonicPc} ${s.scale.slug}`);
    assert.deepEqual(same.sort(), ["2 suspended-pentatonic", "4 man-gong", "7 ritusen", "9 minor-pentatonic"]);
  });

  it("the five rotations of the major pentatonic (and the blues scale, on the minor's) use its boxes; the Japanese scales two notes per string", () => {
    const boxed = PENTATONICS.filter((p) => pentatonicPositions(pentatonicContext(0, p).host, p.degrees).boxes).map((p) => p.slug);
    assert.deepEqual(boxed, ["major-pentatonic", "minor-pentatonic", "minor-blues", "suspended-pentatonic", "man-gong", "ritusen"]);
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
