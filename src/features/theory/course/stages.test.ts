import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STAGE_CONTENT } from "./stages";
import { TRACKS } from "./outline";
import { THEORY_SECTIONS } from "../sections";
import { tabFor } from "@/lib/chordKit/tab";

const ok = (href: string) => {
  const path = href.split(/[?#]/)[0];
  return /^\/theory\/stage\/[1-4]$/.test(path) || THEORY_SECTIONS.some((s) => { const p = s.href.split("#")[0]; return path === p || path.startsWith(`${p}/`); });
};

describe("stage content", () => {
  it("four stages, each with the three tracks", () => {
    assert.deepEqual(STAGE_CONTENT.map((s) => s.n), [1, 2, 3, 4]);
    STAGE_CONTENT.forEach((s) => assert.deepEqual(s.tracks.map((t) => t.id), TRACKS.map((t) => t.id)));
  });
  it("every melody can be played on the guitar", () => {
    STAGE_CONTENT.flatMap((s) => s.tracks.flatMap((t) => t.melodies ?? [])).forEach((m) => assert.doesNotThrow(() => tabFor(m.notes, m.position), m.title));
  });
  it("every link goes to a real theory page", () => {
    STAGE_CONTENT.flatMap((s) => s.tracks.flatMap((t) => [...t.explore, ...t.practise])).forEach((l) => assert.ok(ok(l.href), l.href));
  });
  it("stage 1 songs use only the stage 1 open chords", () => {
    const allowed = new Set(["Em", "Am", "C", "D", "G", "E", "A", "Dm"]);
    STAGE_CONTENT[0].tracks.flatMap((t) => t.songs ?? []).forEach((song) => song.chords.forEach((c) => assert.ok(allowed.has(c), `${song.title}: ${c}`)));
  });
});
