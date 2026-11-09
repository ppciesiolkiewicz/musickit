import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeyChoice } from "@/features/creator/model/key";
import { findPentatonic } from "@/features/theory/pentatonics";
import { CAGED_LETTERS } from "@/lib/chordKit/caged";
import { POSITION_COUNT } from "@/lib/chordKit/scalePositions";
import { FAMILIES, addableValues, allOptions, describeSubject, familyOf, isAll, stepValues, toggleAll, toggleOption, updateSubject, visibleControls } from "./families";
import { subjectName, subjectTitle, type Subject } from "./subject";

const C_MAJOR: KeyChoice = { tonicPc: 0, family: 0, mode: 0 };
const A_MINOR: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
const D_DORIAN: KeyChoice = { tonicPc: 2, family: 0, mode: 1 };
const family = (id: string) => FAMILIES.find((f) => f.id === id)!;

test("the families, in the palette's order", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ["scale", "caged", "arpeggio", "chord-shapes", "staff"]);
});

test("a major pentatonic with two boxes reads as its scale, key and positions", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0, boxes: [1, 2] } };
  assert.equal(describeSubject(s), "Scale · C major pentatonic · positions 1–2");
});

test("without boxes the positions part is left out", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0 } };
  assert.equal(describeSubject(s), "Scale · C major pentatonic · positions");
});

test("CAGED with two shapes names the key in its CAGED quality and the shapes", () => {
  assert.equal(describeSubject({ kind: "caged", key: C_MAJOR, shape: null, shapes: ["E", "A"] }), "CAGED · C major · E, A shapes");
  assert.equal(describeSubject({ kind: "caged", key: { tonicPc: 2, family: 0, mode: 1 }, shape: null, shapes: ["E"] }), "CAGED · D minor · E shape");
  assert.equal(describeSubject({ kind: "caged", key: C_MAJOR, shape: null }), "CAGED · C major · whole neck");
});

test("subjects outside the families have no row text", () => {
  assert.equal(describeSubject({ kind: "plugin", plugin: "circle", key: C_MAJOR }), null);
  assert.equal(describeSubject({ kind: "section", section: "chords", key: C_MAJOR }), null);
  assert.equal(familyOf({ kind: "camera" }), null);
});

test("every family's widget belongs to that family, in any key", () => {
  for (const f of FAMILIES) {
    for (const key of [C_MAJOR, A_MINOR, D_DORIAN]) {
      const s = f.make({}, key);
      assert.equal(familyOf(s)?.id, f.id, `${f.id} in ${JSON.stringify(key)}`);
      assert.equal(typeof describeSubject(s), "string");
    }
  }
});

test("main controls: key, scale, what to show, and as many positions as the scale has", () => {
  const c = (id: string, name: string) => family(id).controls.find((x) => x.name === name)!;
  assert.deepEqual(family("scale").controls.map((x) => x.name), ["key", "scale", "show", "boxes"]);
  assert.deepEqual(c("scale", "boxes").options!.map((o) => o.value), [1, 2, 3, 4, 5].slice(0, POSITION_COUNT.scale));
  assert.ok(c("scale", "scale").options!.some((o) => o.value === "minor-pentatonic") && c("scale", "scale").options!.some((o) => o.value === "dorian"));
  assert.equal(c("scale", "key").options!.length, 12);
  const shapes = c("caged", "shapes");
  assert.deepEqual(shapes.options!.map((o) => o.value), ["overview", ...CAGED_LETTERS]);
});

test("the minor pentatonic in A is the minor-pentatonic slug on scale-neck", () => {
  const s = family("scale").make({ scale: "minor-pentatonic", boxes: [1] }, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } });
  assert.ok(findPentatonic("minor-pentatonic"));
  assert.equal(describeSubject(s), "Scale · A minor pentatonic · position 1");
});

test("no scale chosen takes the key's mode, all five positions; a key picked sets the tonic", () => {
  assert.deepEqual(family("scale").make({}, D_DORIAN), { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, boxes: [1, 2, 3, 4, 5] } });
  assert.equal((family("scale").make({ key: 7 }, D_DORIAN) as Extract<Subject, { kind: "tool" }>).tool.type, "scale-neck");
  assert.equal(describeSubject(family("scale").make({ key: 7, boxes: [2, 3, 5] }, D_DORIAN)), "Scale · G Dorian · positions 2–3, 5");
});

test("Show: the neck, the positions or both; the neck alone has no positions", () => {
  const make = (show: string[]) => (family("scale").make({ show, boxes: [1, 2] }, C_MAJOR) as Extract<Subject, { kind: "tool" }>).tool;
  assert.deepEqual(make(["positions"]), { type: "scale-neck", scale: "major-ionian", key: 0, boxes: [1, 2] });
  assert.deepEqual(make(["neck", "positions"]), { type: "scale-neck", scale: "major-ionian", key: 0, boxes: [1, 2], neck: true });
  assert.deepEqual(make(["neck"]), { type: "scale-neck", scale: "major-ionian", key: 0, boxes: [1, 2], neck: true, positions: false });
  assert.equal(describeSubject(family("scale").make({ show: ["neck"] }, C_MAJOR)), "Scale · C major · neck");
  assert.equal(describeSubject(family("scale").make({ show: ["neck", "positions"], boxes: [1, 2] }, C_MAJOR)), "Scale · C major · neck, positions 1–2");
});

test("older neck, overview and position subjects read as Scale widgets; the others are widgets of their own", () => {
  const scaleOnes: Subject[] = [
    { kind: "neck", key: C_MAJOR },
    { kind: "section", section: "guitar", key: C_MAJOR },
    { kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR },
    { kind: "position", positionKind: "scale", index: 0, key: C_MAJOR },
  ];
  for (const s of scaleOnes) assert.equal(familyOf(s)?.id, "scale", JSON.stringify(s));
  assert.deepEqual(family("scale").read({ kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR }), { key: 9, scale: "minor-pentatonic", show: ["neck", "positions"], boxes: [2] });
  assert.equal(describeSubject({ kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR }), "Scale · A minor · neck, position 2");
  for (const s of [
    { kind: "section", section: "relatives", key: C_MAJOR },
    { kind: "plugin", plugin: "scale", key: C_MAJOR },
    { kind: "position", positionKind: "3nps", index: 2, key: C_MAJOR },
    { kind: "plugin", plugin: "scale", full: true, key: C_MAJOR },
  ] as Subject[]) assert.equal(familyOf(s), null, JSON.stringify(s));
});

test("editing an older widget makes it the scale-neck tool, its own scale and a pinned tonic kept", () => {
  const neck: Subject = { kind: "neck", key: D_DORIAN, pinned: ["tonic", "scale"] };
  assert.deepEqual(updateSubject(neck, { show: ["neck", "positions"], boxes: [1] }), { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, boxes: [1], neck: true }, pinned: ["tonic"] });
  assert.deepEqual(updateSubject({ kind: "neck", key: D_DORIAN }, { scale: "minor-pentatonic" }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 2, boxes: [1, 2, 3, 4, 5], neck: true, positions: false } });
});

test("changing a tool's key pins its tonic; changing its scale or show keeps its other props", () => {
  const t: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 4, boxes: [2], neck: true, highlight: [0] } };
  assert.deepEqual(updateSubject(t, { key: 7 }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 7, boxes: [2], neck: true, highlight: [0] }, pinned: ["tonic"] });
  assert.deepEqual(updateSubject(t, { show: ["positions"], scale: "dorian" }), { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 4, boxes: [2], highlight: [0] } });
});

test("a pentatonic widget keeps its own pentatonic and other props", () => {
  const blues: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1], highlight: [0] } };
  assert.deepEqual(updateSubject(blues, { boxes: [1, 2] }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1, 2], highlight: [0] } });
  assert.match(describeSubject(blues)!, /^Scale · A .*blues.* · position 1$/);
});

test("Position shows only when the positions are", () => {
  const names = (v: Record<string, string[]>) => visibleControls(family("scale"), v).map((c) => c.name);
  assert.deepEqual(names({ show: ["positions"] }), ["key", "scale", "show", "boxes"]);
  assert.deepEqual(names({ show: ["neck", "positions"] }), ["key", "scale", "show", "boxes"]);
  assert.deepEqual(names({ show: ["neck"] }), ["key", "scale", "show"]);
  assert.deepEqual(visibleControls(family("caged"), {}).map((c) => c.name), ["shapes"]);
});

test("CAGED letters keep the CAGED order; overview is the whole neck", () => {
  assert.deepEqual(family("caged").make({ shapes: ["E", "C"] }, C_MAJOR), { kind: "caged", key: C_MAJOR, shape: null, shapes: ["C", "E"] });
  assert.deepEqual(family("caged").make({ shapes: ["overview"] }, C_MAJOR), { kind: "caged", key: C_MAJOR, shape: null });
  assert.deepEqual(family("caged").read({ kind: "caged", key: C_MAJOR, shape: "G" }), { shapes: ["G"] });
});

test("one CAGED letter is saved as the single shape older widgets have; it reads back and names the same", () => {
  const one = family("caged").make({ shapes: ["G"] }, C_MAJOR);
  assert.deepEqual(one, { kind: "caged", key: C_MAJOR, shape: "G" });
  assert.equal(familyOf(one)?.id, "caged");
  assert.deepEqual(family("caged").read(one), { shapes: ["G"] });
  assert.equal(describeSubject(one), "CAGED · C major · G shape");
  assert.deepEqual(updateSubject(one, { shapes: ["G", "E"] }), { kind: "caged", key: C_MAJOR, shape: null, shapes: ["G", "E"] });
  assert.deepEqual(updateSubject({ kind: "caged", key: C_MAJOR, shape: null, shapes: ["G", "E"] }, { shapes: ["E"] }), { kind: "caged", key: C_MAJOR, shape: "E" });
});

test("an arpeggio defaults to the key's own chord and reads its boxes", () => {
  const s = family("arpeggio").make({}, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am", boxes: [1] } });
  assert.equal(describeSubject(family("arpeggio").make({ chord: "G7", boxes: [2, 3] }, A_MINOR)), "Arpeggio · G7 · boxes 2, 3");
});

test("chord shapes default to the key's I, IV and V", () => {
  const s = family("chord-shapes").make({}, C_MAJOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "chord-shapes", chords: ["C", "F", "G"] } });
  assert.equal(describeSubject(family("chord-shapes").make({ chords: "G Em, C D7", voicing: "barre" }, C_MAJOR)), "Chord shapes · G, Em, C, D7 · barre");
});

test("a staff is the scale on a staff for a voice", () => {
  const s = family("staff").make({}, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "staff", scale: "natural-minor-aeolian", key: 9, voice: "baritone" } });
  assert.equal(describeSubject(s), "Staff · A minor · baritone");
});

test("updating keeps the key and the pins, and changes the props", () => {
  const tool: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 4, boxes: [1] }, pinned: ["tonic"] };
  assert.deepEqual(updateSubject(tool, { boxes: [2, 3] }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 4, boxes: [2, 3] }, pinned: ["tonic"] });
  const caged: Subject = { kind: "caged", key: D_DORIAN, pinned: ["scale"], shape: null };
  assert.deepEqual(updateSubject(caged, { shapes: ["A", "D"] }), { kind: "caged", key: D_DORIAN, pinned: ["scale"], shape: null, shapes: ["A", "D"] });
  const arp: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "Em", boxes: [1] } };
  assert.deepEqual(updateSubject(arp, { boxes: [2] }), { kind: "tool", tool: { type: "arpeggio-neck", chord: "Em", boxes: [2] } });
  const outside: Subject = { kind: "section", section: "chords", key: C_MAJOR };
  assert.equal(updateSubject(outside, {}), outside);
});

test("clearing or mistyping an arpeggio's chord keeps the chord it had", () => {
  const arp: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "Dm7", boxes: [2] } };
  assert.deepEqual(updateSubject(arp, { chord: "" }), arp);
  assert.deepEqual(updateSubject(arp, { chord: "Xq9" }), arp);
  assert.deepEqual(updateSubject(arp, { chord: "G7" }), { kind: "tool", tool: { type: "arpeggio-neck", chord: "G7", boxes: [2] } });
});

test("updating keeps the props outside the main controls", () => {
  const pent: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], add: [3], highlight: [0], enable: [0, 3, 7], others: "hidden" } };
  assert.deepEqual(updateSubject(pent, { boxes: [2] }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [2], add: [3], highlight: [0], enable: [0, 3, 7], others: "hidden" } });
  const staff: Subject = { kind: "tool", tool: { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", mic: true, drone: true } };
  assert.deepEqual(updateSubject(staff, { voice: "alto" }), { kind: "tool", tool: { type: "staff", scale: "major-ionian", key: 0, voice: "alto", mic: true, drone: true } });
  const arp: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am7", boxes: [1], part: ["1", "b3"] } };
  assert.deepEqual(updateSubject(arp, { boxes: [2, 3] }), { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am7", boxes: [2, 3], part: ["1", "b3"] } });
  // a placement stands in for boxes: it stays until boxes are picked
  const placed: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, placement: { by: "root", string: 5 } } };
  assert.deepEqual(updateSubject(placed, { scale: "phrygian" }), { kind: "tool", tool: { type: "scale-neck", scale: "phrygian", key: 2, placement: { by: "root", string: 5 } } });
});

test("an arpeggio's boxes control keeps at most two, as the component does", () => {
  const boxes = family("arpeggio").controls.find((c) => c.name === "boxes")!;
  assert.equal(boxes.max, 2);
  assert.deepEqual((family("arpeggio").make({ chord: "Am", boxes: [1, 2, 3] }, A_MINOR) as Extract<Subject, { kind: "tool" }>).tool, { type: "arpeggio-neck", chord: "Am", boxes: [1, 2] });
});

const control = (id: string, name: string) => family(id).controls.find((c) => c.name === name)!;

test("the add form starts from what the family makes in the key", () => {
  assert.deepEqual(stepValues(family("scale"), A_MINOR), { key: 9, scale: "natural-minor-aeolian", show: ["positions"], boxes: [1, 2, 3, 4, 5] });
  assert.deepEqual(stepValues(family("arpeggio"), A_MINOR), { chord: "Am", boxes: [1] });
  assert.deepEqual(stepValues(family("caged"), C_MAJOR), { shapes: ["overview"] });
  // nothing ticked adds the family's default
  assert.deepEqual(addableValues({ scale: "dorian", boxes: [] }), { scale: "dorian" });
  assert.deepEqual(family("scale").make(addableValues({ ...stepValues(family("scale"), A_MINOR), boxes: [] }), A_MINOR), family("scale").make({}, A_MINOR));
});

test("toggling a box adds or removes it", () => {
  const boxes = control("scale", "boxes");
  assert.deepEqual(toggleOption(boxes, [1], 3), [1, 3]);
  assert.deepEqual(toggleOption(boxes, [1, 3], 1), [3]);
  assert.deepEqual(toggleOption(boxes, [], 2), [2]);
});

test("an arpeggio's boxes keep the two last ticked and have no All", () => {
  const boxes = control("arpeggio", "boxes");
  assert.deepEqual(toggleOption(boxes, [1, 2], 3), [2, 3]);
  assert.equal(allOptions(boxes), null);
  assert.equal(isAll(boxes, [1, 2]), false);
});

test("All ticks every box, and again clears them", () => {
  const boxes = control("scale", "boxes");
  assert.deepEqual(allOptions(boxes), [1, 2, 3, 4, 5]);
  assert.deepEqual(toggleAll(boxes, [2]), [1, 2, 3, 4, 5]);
  assert.equal(isAll(boxes, [5, 4, 3, 2, 1]), true);
  assert.deepEqual(toggleAll(boxes, [1, 2, 3, 4, 5]), []);
});

test("CAGED's Overview stands alone and All is the five shapes", () => {
  const shapes = control("caged", "shapes");
  assert.deepEqual(toggleOption(shapes, ["overview"], "E"), ["E"]);
  assert.deepEqual(toggleOption(shapes, ["E", "A"], "overview"), ["overview"]);
  assert.deepEqual(allOptions(shapes), [...CAGED_LETTERS]);
  assert.deepEqual(toggleAll(shapes, ["overview"]), [...CAGED_LETTERS]);
});

test("a tool widget's name and title come from its family", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0, boxes: [1, 2] } };
  assert.equal(subjectTitle(s), "Scale · C major pentatonic · positions 1–2");
  assert.equal(subjectName(s), "Scale · positions 1–2");
});
