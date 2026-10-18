import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STAGE_CONTENT } from "./stages";
import { OPEN_PCS, lessonShape, naturalDots, scaleDots, trackVisual } from "./visuals";

describe("stage visuals", () => {
  it("every track shows a picture or a melody", () => {
    STAGE_CONTENT.forEach((s) => s.tracks.forEach((t) => assert.ok(trackVisual(s.n, t.id) || t.melodies?.length, `${s.n} ${t.id}`)));
  });
  it("every chord a stage shows has a shape, and barre lessons get a barre", () => {
    STAGE_CONTENT.forEach((s) => s.tracks.forEach((t) => {
      const v = trackVisual(s.n, t.id);
      if (v?.kind !== "chords") return;
      v.chords.forEach((c) => {
        const shape = lessonShape(c.name, c.prefer);
        assert.ok(shape, c.name);
        if (c.prefer) assert.ok(shape.shape.tags.includes(c.prefer), `${c.name} ${c.prefer}`);
      });
    }));
  });
  it("neck dots sit inside the drawn frets", () => {
    STAGE_CONTENT.forEach((s) => s.tracks.forEach((t) => {
      const v = trackVisual(s.n, t.id);
      if (v?.kind === "neck") v.dots.forEach((d) => assert.ok(d.fret >= v.from && d.fret <= v.to && d.string >= 0 && d.string < 6, `${s.n} ${t.id}`));
    }));
  });
  it("lessons can ask for the drop 3 voicing of a chord", () => {
    const am7 = lessonShape("Am7", undefined, "drop 3");
    assert.equal(am7?.shape.v, "drop 3");
    assert.equal(am7?.fret, 0);
    assert.equal(lessonShape("Bm7", undefined, "drop 3")?.fret, 2);
    assert.equal(lessonShape("Em7", undefined, "drop 3")?.shape.v, "drop 3");
  });
  it("natural notes on low E start E F G", () => {
    assert.deepEqual(naturalDots([0], 3).map((d) => d.label), ["E", "F", "G"]);
  });
  it("A minor pentatonic box 1 has its roots on the 5th fret of both E strings", () => {
    const roots = scaleDots(9, [0, 3, 5, 7, 10], [0, 2, 3, 4, 6].map((d, i) => ({ d, label: ["R", "♭3", "4", "5", "♭7"][i] })), 5, 8).filter((d) => d.label === "R");
    assert.ok(roots.some((d) => d.string === 0 && d.fret === 5));
    assert.ok(roots.some((d) => d.string === 5 && d.fret === 5));
    roots.forEach((d) => assert.equal((OPEN_PCS[d.string] + d.fret) % 12, 9));
  });
});
