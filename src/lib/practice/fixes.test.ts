import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acquireStream, micGate } from "./mic";
import { menuClick } from "./menu";
import { pianoFrom } from "@/lib/chordKit/intervals";
import { MODE_GROUPS } from "@/features/theory/modeGroups";

describe("review fixes", () => {
  it("a stream that arrives after the hook stopped is released at once", async () => {
    let stopped = 0;
    const fake = { getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] } as unknown as MediaStream;
    assert.equal(await acquireStream(async () => fake, () => true), null);
    assert.equal(stopped, 2);
    assert.equal(await acquireStream(async () => fake, () => false), fake);
  });
  it("a held note scores once: the gate re-arms only after silence or a new pitch", () => {
    let g = micGate.initial;
    let r = micGate.step(g, 4, 4); assert.equal(r.score, true); g = r.state;
    r = micGate.step(g, 4, 4); assert.equal(r.score, false, "same note still ringing"); g = r.state;
    r = micGate.step(g, null, 4); assert.equal(r.score, false); g = r.state;
    r = micGate.step(g, 4, 4); assert.equal(r.score, true, "played again after silence"); g = r.state;
    r = micGate.step(g, 9, 4); assert.equal(r.score, false, "wrong note"); g = r.state;
    r = micGate.step(g, 4, 4); assert.equal(r.score, true, "new pitch then the target");
  });
  it("hover-opened menu stays open on the click that follows", () => {
    assert.equal(menuClick({ open: true, hoverOpenedAt: 1000, now: 1200, pointerType: "mouse" }), true);
    assert.equal(menuClick({ open: true, hoverOpenedAt: 1000, now: 5000, pointerType: "mouse" }), false);
    assert.equal(menuClick({ open: false, hoverOpenedAt: null, now: 0, pointerType: "touch" }), true);
    assert.equal(menuClick({ open: true, hoverOpenedAt: null, now: 0, pointerType: "touch" }), false);
  });
  it("the piano window covers every note played", () => {
    for (const notes of [[64, 76], [61, 65, 68, 72], [48, 60], [40, 52], [59, 71]]) {
      const from = pianoFrom(notes);
      assert.ok(notes.every((n) => n >= from && n < from + 24), `${notes} from ${from}`);
    }
  });
  it("Lydian dominant is taught over the right chord", () => {
    const mel = MODE_GROUPS.find((g) => g.id === "mel")!.teach.practise;
    assert.ok(mel.includes("F7♯11") && !mel.includes("D7♯11"));
  });
});
