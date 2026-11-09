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

test("an arpeggio starts on the key's own 7th chord, every position, in the key and scale", () => {
  const s = family("arpeggio").make({}, A_MINOR);
  assert.deepEqual(s, { kind: "arpeggio", key: A_MINOR, degree: 0, type: "seventh", roots: [6, 5, 4, 3, 2] });
  assert.equal(describeSubject(s), "Arpeggio · A minor · i Scale 7th, all positions");
});

test("an arpeggio reads back what it was made from: key, scale, chord, type, what it shows, root strings", () => {
  const values = { key: 2, scale: "dorian", degree: 4, type: "m7b5", show: ["neck"], roots: [5, 4] };
  const s = family("arpeggio").make(values, C_MAJOR);
  assert.deepEqual(s, { kind: "arpeggio", key: D_DORIAN, degree: 4, type: "m7b5", neck: true, positions: false, roots: [5, 4] });
  assert.deepEqual(family("arpeggio").read(s), values);
  assert.equal(describeSubject(s), "Arpeggio · D Dorian · v Min7♭5, neck");
  assert.equal(describeSubject(family("arpeggio").make({ ...values, show: ["neck", "positions"] }, C_MAJOR)), "Arpeggio · D Dorian · v Min7♭5, neck, root on 5th, 4th");
});

test("an arpeggio's chord list is named in the key and scale picked, and root strings show only with positions", () => {
  const arp = family("arpeggio");
  const on = (values: Record<string, string | number | string[] | number[]>) => visibleControls(arp, values).find((c) => c.name === "degree")!.options!;
  assert.deepEqual(on({ key: 7, scale: "major-ionian" })[4], { value: 4, label: "V · D" });
  assert.deepEqual(on({ key: 9, scale: "natural-minor-aeolian" })[0], { value: 0, label: "i · A" });
  assert.ok(visibleControls(arp, { show: ["positions"] }).some((c) => c.name === "roots"));
  assert.ok(!visibleControls(arp, { show: ["neck"] }).some((c) => c.name === "roots"));
});

test("an arpeggio made on a stage with no root keeps no root unless a key is picked", () => {
  const none: KeyChoice = { tonicPc: null, family: 0, mode: 0 };
  const arp = family("arpeggio");
  assert.equal(arp.read(arp.make({}, none))!.key, 4);
  assert.equal((arp.make(stepValues(arp, none), none) as Extract<Subject, { kind: "arpeggio" }>).key.tonicPc, null);
  assert.equal((arp.make({ ...stepValues(arp, none), key: 7 }, none) as Extract<Subject, { kind: "arpeggio" }>).key.tonicPc, 7);
});

test("changing an arpeggio pins only the part of its key changed on it", () => {
  const arp = family("arpeggio").make({}, C_MAJOR);
  assert.equal("pinned" in updateSubject(arp, { degree: 3, type: "triad", roots: [6] }), false);
  assert.deepEqual((updateSubject(arp, { key: 7 }) as Extract<Subject, { kind: "arpeggio" }>).pinned, ["tonic"]);
  assert.deepEqual((updateSubject(arp, { scale: "dorian" }) as Extract<Subject, { kind: "arpeggio" }>).pinned, ["scale"]);
});

test("an older typed-chord arpeggio reads as the family, stays until really changed, then is made over", () => {
  const g9: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "G9", boxes: [2, 3] } };
  assert.equal(describeSubject(g9), "Arpeggio · G9 · boxes 2, 3");
  assert.deepEqual(family("arpeggio").read(g9), { key: 7, scale: "major-ionian", degree: 0, type: "7", show: ["positions"], roots: [5, 4] });
  // closing its editor sends back what it read: nothing changes
  assert.equal(updateSubject(g9, family("arpeggio").read(g9)!), g9);
  assert.deepEqual(updateSubject(g9, { roots: [6] }), { kind: "arpeggio", key: { tonicPc: 7, family: 0, mode: 0 }, degree: 0, type: "7", roots: [6], pinned: ["scale"] });
  const am: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am", placement: { by: "root", string: 5 } } };
  assert.deepEqual(family("arpeggio").read(am), { key: 9, scale: "natural-minor-aeolian", degree: 0, type: "min", show: ["positions"], roots: [5] });
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
  const outside: Subject = { kind: "section", section: "chords", key: C_MAJOR };
  assert.equal(updateSubject(outside, {}), outside);
});

test("updating keeps the props outside the main controls", () => {
  const pent: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], add: [3], highlight: [0], enable: [0, 3, 7], others: "hidden" } };
  assert.deepEqual(updateSubject(pent, { boxes: [2] }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [2], add: [3], highlight: [0], enable: [0, 3, 7], others: "hidden" } });
  const staff: Subject = { kind: "tool", tool: { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", mic: true, drone: true } };
  assert.deepEqual(updateSubject(staff, { voice: "alto" }), { kind: "tool", tool: { type: "staff", scale: "major-ionian", key: 0, voice: "alto", mic: true, drone: true } });
  // a placement stands in for boxes: it stays until boxes are picked
  const placed: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, placement: { by: "root", string: 5 } } };
  assert.deepEqual(updateSubject(placed, { scale: "phrygian" }), { kind: "tool", tool: { type: "scale-neck", scale: "phrygian", key: 2, placement: { by: "root", string: 5 } } });
});

const control = (id: string, name: string) => family(id).controls.find((c) => c.name === name)!;

test("the add form starts from what the family makes in the key", () => {
  assert.deepEqual(stepValues(family("scale"), A_MINOR), { key: 9, scale: "natural-minor-aeolian", show: ["positions"], boxes: [1, 2, 3, 4, 5] });
  assert.deepEqual(stepValues(family("arpeggio"), A_MINOR), { key: 9, scale: "natural-minor-aeolian", degree: 0, type: "seventh", show: ["positions"], roots: [6, 5, 4, 3, 2] });
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
