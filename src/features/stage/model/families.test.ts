import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeyChoice } from "@/features/creator/model/key";
import { findPentatonic } from "@/features/theory/pentatonics";
import { CAGED_LETTERS } from "@/lib/chordKit/caged";
import { POSITION_COUNT } from "@/lib/chordKit/scalePositions";
import { FAMILIES, addableValues, allOptions, describeSubject, familyOf, isAll, moreProps, moreValues, parseMoreText, stepValues, toggleAll, toggleOption, updateSubject, withMore } from "./families";
import { subjectName, subjectTitle, type Subject } from "./subject";

const C_MAJOR: KeyChoice = { tonicPc: 0, family: 0, mode: 0 };
const A_MINOR: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
const D_DORIAN: KeyChoice = { tonicPc: 2, family: 0, mode: 1 };
const family = (id: string) => FAMILIES.find((f) => f.id === id)!;

test("the families, in the palette's order", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ["pentatonic", "scale-positions", "three-nps", "caged", "arpeggio", "chord-shapes", "staff"]);
});

test("a major pentatonic with two boxes reads as its scale, key and positions", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0, boxes: [1, 2] } };
  assert.equal(describeSubject(s), "Major pentatonic · C major · positions 1, 2");
});

test("without boxes the positions part is left out", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0 } };
  assert.equal(describeSubject(s), "Major pentatonic · C major");
});

test("CAGED with two shapes names the key in its CAGED quality and the shapes", () => {
  assert.equal(describeSubject({ kind: "caged", key: C_MAJOR, shape: null, shapes: ["E", "A"] }), "CAGED · C major · E, A shapes");
  assert.equal(describeSubject({ kind: "caged", key: { tonicPc: 2, family: 0, mode: 1 }, shape: null, shapes: ["E"] }), "CAGED · D minor · E shape");
  assert.equal(describeSubject({ kind: "caged", key: C_MAJOR, shape: null }), "CAGED · C major · whole neck");
});

test("subjects outside the families have no row text", () => {
  assert.equal(describeSubject({ kind: "neck", key: C_MAJOR }), null);
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

test("main controls start at box 1 and offer as many boxes as the scale has positions", () => {
  const boxes = (id: string, name = "boxes") => family(id).controls.find((c) => c.name === name)!;
  assert.deepEqual(boxes("pentatonic").default, [1]);
  assert.deepEqual(boxes("pentatonic").options!.map((o) => o.value), [1, 2, 3, 4, 5].slice(0, POSITION_COUNT.pentatonic));
  assert.deepEqual(boxes("scale-positions").options!.length, POSITION_COUNT.scale);
  assert.deepEqual(boxes("three-nps", "position").options!.length, POSITION_COUNT["3nps"]);
  const shapes = family("caged").controls.find((c) => c.name === "shapes")!;
  assert.deepEqual(shapes.options!.map((o) => o.value), ["overview", ...CAGED_LETTERS]);
});

test("the minor pentatonic in A is the minor-pentatonic slug on scale-neck", () => {
  const s = family("pentatonic").make({ scale: "minor-pentatonic", boxes: [1] }, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } });
  assert.ok(findPentatonic("minor-pentatonic"));
  assert.equal(describeSubject(s), "Minor pentatonic · A minor · position 1");
});

test("a pentatonic with no scale chosen takes the key's quality", () => {
  const tool = (key: KeyChoice) => (family("pentatonic").make({}, key) as Extract<Subject, { kind: "tool" }>).tool;
  assert.equal((tool(C_MAJOR) as { scale: string }).scale, "major-pentatonic");
  assert.equal((tool(A_MINOR) as { scale: string }).scale, "minor-pentatonic");
});

test("scale positions take the key's mode as the scale slug unless one is chosen", () => {
  const s = family("scale-positions").make({}, D_DORIAN);
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, boxes: [1] } });
  assert.equal(describeSubject(s), "Scale positions · D Dorian · position 1");
  const minor = family("scale-positions").make({ scale: "natural-minor-aeolian", boxes: [2, 3] }, A_MINOR);
  assert.equal(describeSubject(minor), "Scale positions · A minor · positions 2, 3");
});

test("3 notes per string is the position subject, one of seven", () => {
  const s = family("three-nps").make({ position: 7 }, C_MAJOR);
  assert.deepEqual(s, { kind: "position", positionKind: "3nps", index: 6, key: C_MAJOR });
  assert.equal(describeSubject(s), "3 notes per string · C major · position 7");
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
  const outside: Subject = { kind: "neck", key: C_MAJOR };
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

test("step two starts from what the family makes in the key; Add another starts with nothing ticked", () => {
  assert.deepEqual(stepValues(family("pentatonic"), A_MINOR), { scale: "minor-pentatonic", boxes: [1] });
  assert.deepEqual(stepValues(family("pentatonic"), C_MAJOR), { scale: "major-pentatonic", boxes: [1] });
  assert.deepEqual(stepValues(family("arpeggio"), A_MINOR), { chord: "Am", boxes: [1] });
  assert.deepEqual(stepValues(family("pentatonic"), A_MINOR, true), { scale: "minor-pentatonic", boxes: [] });
  assert.deepEqual(stepValues(family("caged"), C_MAJOR, true), { shapes: [] });
  // nothing ticked adds the family's default
  assert.deepEqual(addableValues({ scale: "dorian", boxes: [] }), { scale: "dorian" });
  assert.deepEqual(family("pentatonic").make(addableValues(stepValues(family("pentatonic"), A_MINOR, true)), A_MINOR), family("pentatonic").make({}, A_MINOR));
});

test("toggling a box adds or removes it", () => {
  const boxes = control("pentatonic", "boxes");
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
  const boxes = control("pentatonic", "boxes");
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

test("More lists the component's other props, not the main ones or the key", () => {
  const names = (id: string) => moreProps(family(id)).map((p) => p.name);
  assert.deepEqual(names("pentatonic"), ["placement", "add", "enable", "highlight", "mute", "hide", "others"]);
  assert.ok(!names("arpeggio").includes("chord") && names("arpeggio").includes("part"));
  assert.ok(!names("staff").includes("voice") && names("staff").includes("mic"));
  assert.deepEqual(names("caged"), []);
  assert.deepEqual(names("three-nps"), []);
});

test("More's fields read a widget's other props as JSON", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], highlight: [0], others: "hidden", enable: [0, 3] } };
  assert.deepEqual(moreValues(s, family("pentatonic")), { enable: "[0,3]", highlight: "[0]", others: '"hidden"' });
  assert.deepEqual(moreValues({ kind: "caged", key: C_MAJOR, shape: null }, family("caged")), {});
});

test("a More field takes JSON or a bare word; blank takes the prop off", () => {
  assert.deepEqual(parseMoreText('["b3", "5"]'), { ok: true, value: ["b3", "5"] });
  assert.deepEqual(parseMoreText("muted"), { ok: true, value: "muted" });
  assert.deepEqual(parseMoreText("true"), { ok: true, value: true });
  assert.deepEqual(parseMoreText("  "), { ok: true, value: undefined });
  assert.deepEqual(parseMoreText("[b3, 5"), { ok: false });
});

test("setting other props parses them as the plan does, keeps the pins and names what it dropped", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], highlight: [0] }, pinned: ["tonic"] };
  const set = withMore(s, { highlight: undefined, enable: ["1", "b3", "5"], others: "muted" });
  assert.deepEqual(set, { subject: { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], enable: [0, 3, 7], others: "muted" }, pinned: ["tonic"] }, dropped: [] });
  // boxes say where the box is, so a placement beside them is dropped
  assert.deepEqual(withMore(s, { placement: { by: "root", string: 5 } }).dropped, ["placement"]);
  const caged: Subject = { kind: "caged", key: C_MAJOR, shape: null };
  assert.deepEqual(withMore(caged, { enable: [1] }), { subject: caged, dropped: [] });
});

test("a tool widget's name and title come from its family", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0, boxes: [1, 2] } };
  assert.equal(subjectTitle(s), "Major pentatonic · C major · positions 1, 2");
  assert.equal(subjectName(s), "Major pentatonic · positions 1, 2");
});
