import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeyChoice } from "@/features/creator/model/key";
import { findPentatonic } from "@/features/theory/pentatonics";
import { CAGED_LETTERS } from "@/lib/chordKit/caged";
import { POSITION_COUNT } from "@/lib/chordKit/scalePositions";
import { FAMILIES, addableValues, allOptions, describeSubject, familyOf, isAll, moreProps, moreValues, parseMoreText, stepValues, toggleAll, toggleOption, updateSubject, visibleControls, withMore } from "./families";
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
  assert.equal(describeSubject(s), "Scale · C major · pentatonic, 1–2");
});

test("without boxes the positions part is left out", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "major-pentatonic", key: 0 } };
  assert.equal(describeSubject(s), "Scale · C major · pentatonic");
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

test("main controls start at box 1 and offer as many positions as the scale has", () => {
  const boxes = (id: string, name = "boxes") => family(id).controls.find((c) => c.name === name)!;
  assert.deepEqual(boxes("scale").default, [1]);
  assert.deepEqual(boxes("scale").options!.map((o) => o.value), [1, 2, 3, 4, 5].slice(0, POSITION_COUNT.pentatonic));
  assert.equal(POSITION_COUNT.scale, POSITION_COUNT.pentatonic);
  assert.deepEqual(boxes("scale", "position").options!.length, POSITION_COUNT["3nps"]);
  const shapes = family("caged").controls.find((c) => c.name === "shapes")!;
  assert.deepEqual(shapes.options!.map((o) => o.value), ["overview", ...CAGED_LETTERS]);
});

test("the minor pentatonic in A is the minor-pentatonic slug on scale-neck", () => {
  const s = family("scale").make({ scale: "minor-pentatonic", boxes: [1] }, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } });
  assert.ok(findPentatonic("minor-pentatonic"));
  assert.equal(describeSubject(s), "Scale · A minor · pentatonic, 1");
});

test("a pentatonic with no scale chosen takes the key's quality", () => {
  const tool = (key: KeyChoice) => (family("scale").make({}, key) as Extract<Subject, { kind: "tool" }>).tool;
  assert.equal((tool(C_MAJOR) as { scale: string }).scale, "major-pentatonic");
  assert.equal((tool(A_MINOR) as { scale: string }).scale, "minor-pentatonic");
});

test("scale positions take the key's mode as the scale slug unless one is chosen", () => {
  const s = family("scale").make({ style: "scale" }, D_DORIAN);
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, boxes: [1] } });
  assert.equal(describeSubject(s), "Scale · D Dorian · scale, 1");
  const minor = family("scale").make({ style: "scale", scale: "natural-minor-aeolian", boxes: [2, 3, 5] }, A_MINOR);
  assert.equal(describeSubject(minor), "Scale · A minor · scale, 2–3, 5");
});

test("3 notes per string is the position subject, one of seven", () => {
  const s = family("scale").make({ style: "3nps", position: [7] }, C_MAJOR);
  assert.deepEqual(s, { kind: "position", positionKind: "3nps", index: 6, key: C_MAJOR });
  assert.equal(describeSubject(s), "Scale · C major · 3 notes per string, 7");
  assert.deepEqual(family("scale").make({ style: "3nps", position: 3 }, C_MAJOR), { kind: "position", positionKind: "3nps", index: 2, key: C_MAJOR });
});

test("the Scale family maps each view to its subject", () => {
  const make = (view: string) => family("scale").make({ view }, D_DORIAN);
  assert.deepEqual(make("neck"), { kind: "neck", key: D_DORIAN });
  assert.deepEqual(make("overview"), { kind: "section", section: "guitar", key: D_DORIAN });
  assert.deepEqual(make("intervals"), { kind: "plugin", plugin: "scale", key: D_DORIAN });
  assert.deepEqual(make("relatives"), { kind: "section", section: "relatives", key: D_DORIAN });
  assert.equal(describeSubject(make("neck")), "Scale · D Dorian · whole neck");
  assert.equal(describeSubject(make("overview")), "Scale · D Dorian · overview");
  assert.equal(describeSubject(make("intervals")), "Scale · D Dorian · intervals within each mode");
  assert.equal(describeSubject(make("relatives")), "Scale · D Dorian · relative modes");
});

test("every Scale subject reads back as the Scale family, the old single boxes too", () => {
  const scaleOnes: Subject[] = [
    { kind: "neck", key: C_MAJOR },
    { kind: "section", section: "guitar", key: C_MAJOR },
    { kind: "section", section: "relatives", key: C_MAJOR },
    { kind: "plugin", plugin: "scale", key: C_MAJOR },
    { kind: "position", positionKind: "3nps", index: 2, key: C_MAJOR },
    { kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR },
    { kind: "position", positionKind: "scale", index: 0, key: C_MAJOR },
  ];
  for (const s of scaleOnes) assert.equal(familyOf(s)?.id, "scale", JSON.stringify(s));
  assert.deepEqual(family("scale").read({ kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR }), { view: "positions", style: "pentatonic", boxes: [2], position: [1] });
  assert.equal(describeSubject({ kind: "position", positionKind: "pentatonic", index: 1, key: A_MINOR }), "Scale · A minor · pentatonic, 2");
  // the full Scale page and the other sections are not Scale widgets
  assert.equal(familyOf({ kind: "plugin", plugin: "scale", full: true, key: C_MAJOR }), null);
});

test("switching View converts the subject, keeping its key and pins", () => {
  const pent: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 4, boxes: [2] }, pinned: ["tonic"] };
  const E_AEOLIAN = { tonicPc: 4, family: 0, mode: 5 };
  assert.deepEqual(updateSubject(pent, { view: "neck" }), { kind: "neck", key: E_AEOLIAN, pinned: ["tonic", "scale"] });
  // unpinned, its scale is still its own: a neck made from a C minor pentatonic keeps C minor when the master moves to D major
  const free: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 0, boxes: [1] } };
  assert.deepEqual(updateSubject(free, { view: "neck" }), { kind: "neck", key: { tonicPc: 0, family: 0, mode: 5 }, pinned: ["scale"] });
  assert.deepEqual(updateSubject(pent, { style: "scale" }), { kind: "tool", tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: 4, boxes: [2] }, pinned: ["tonic"] });
  assert.deepEqual(updateSubject(pent, { style: "3nps" }), { kind: "position", positionKind: "3nps", index: 0, key: E_AEOLIAN, pinned: ["tonic", "scale"] });
  const neck: Subject = { kind: "neck", key: D_DORIAN, pinned: ["scale"] };
  assert.deepEqual(updateSubject(neck, { view: "relatives" }), { kind: "section", section: "relatives", key: D_DORIAN, pinned: ["scale"] });
  // to a tool: the scale is its own, so only a pinned tonic can stay
  assert.deepEqual(updateSubject(neck, { view: "positions", style: "scale", boxes: [1, 2] }), { kind: "tool", tool: { type: "scale-neck", scale: "dorian", key: 2, boxes: [1, 2] } });
  assert.deepEqual(updateSubject({ kind: "neck", key: D_DORIAN, pinned: ["tonic", "scale"] }, { view: "positions" }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 2, boxes: [1] }, pinned: ["tonic"] });
  const nps: Subject = { kind: "position", positionKind: "3nps", index: 4, key: C_MAJOR };
  assert.deepEqual(updateSubject(nps, { position: [6] }), { kind: "position", positionKind: "3nps", index: 5, key: C_MAJOR });
  assert.deepEqual(updateSubject(nps, { view: "overview" }), { kind: "section", section: "guitar", key: C_MAJOR });
});

test("a pentatonic widget keeps its own pentatonic while the style stays", () => {
  const blues: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1], highlight: [0] } };
  assert.deepEqual(updateSubject(blues, { boxes: [1, 2] }), { kind: "tool", tool: { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1, 2], highlight: [0] } });
  assert.equal(describeSubject(blues), "Scale · A minor · Minor pentatonic blues, 1");
});

test("Style and Position show only for Positions; 3 notes per string has its own seven", () => {
  const names = (v: Record<string, string>) => visibleControls(family("scale"), v).map((c) => c.name);
  assert.deepEqual(names({ view: "positions", style: "pentatonic" }), ["view", "style", "boxes"]);
  assert.deepEqual(names({ view: "positions", style: "3nps" }), ["view", "style", "position"]);
  assert.deepEqual(names({ view: "neck", style: "pentatonic" }), ["view"]);
  assert.deepEqual(visibleControls(family("caged"), {}).map((c) => c.name), ["shapes"]);
});

test("3 notes per string keeps one position, with no All", () => {
  const position = family("scale").controls.find((c) => c.name === "position")!;
  assert.deepEqual(toggleOption(position, [2], 5), [5]);
  assert.equal(allOptions(position), null);
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
  assert.deepEqual(updateSubject({ kind: "position", positionKind: "3nps", index: 0, key: D_DORIAN, pinned: ["scale"] }, { position: [2] }), { kind: "position", positionKind: "3nps", index: 1, key: D_DORIAN, pinned: ["scale"] });
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
  assert.deepEqual(stepValues(family("scale"), A_MINOR), { view: "positions", style: "pentatonic", boxes: [1], position: [1], scale: "minor-pentatonic" });
  assert.deepEqual(stepValues(family("scale"), C_MAJOR).scale, "major-pentatonic");
  assert.deepEqual(stepValues(family("arpeggio"), A_MINOR), { chord: "Am", boxes: [1] });
  assert.deepEqual(stepValues(family("caged"), C_MAJOR), { shapes: ["overview"] });
  // nothing ticked adds the family's default
  assert.deepEqual(addableValues({ scale: "dorian", boxes: [] }), { scale: "dorian" });
  assert.deepEqual(family("scale").make(addableValues({ ...stepValues(family("scale"), A_MINOR), boxes: [] }), A_MINOR), family("scale").make({}, A_MINOR));
  // switching the style in the form drops a pentatonic slug that isn't a mode
  assert.deepEqual(family("scale").make({ ...stepValues(family("scale"), A_MINOR), style: "scale" }, A_MINOR), { kind: "tool", tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: 9, boxes: [1] } });
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

test("More lists the component's other props, not the main ones or the key", () => {
  const names = (id: string) => moreProps(family(id)).map((p) => p.name);
  assert.deepEqual(names("scale"), ["placement", "add", "enable", "highlight", "mute", "hide", "others"]);
  // only the Scale family's positions are a component
  assert.deepEqual(moreProps(family("scale"), { view: "neck" }), []);
  assert.deepEqual(moreProps(family("scale"), { view: "positions", style: "3nps" }), []);
  assert.equal(moreProps(family("scale"), { view: "positions", style: "scale" }).length, 7);
  assert.ok(!names("arpeggio").includes("chord") && names("arpeggio").includes("part"));
  assert.ok(!names("staff").includes("voice") && names("staff").includes("mic"));
  assert.deepEqual(names("caged"), []);

});

test("More's fields read a widget's other props as JSON", () => {
  const s: Subject = { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1], highlight: [0], others: "hidden", enable: [0, 3] } };
  assert.deepEqual(moreValues(s, family("scale")), { enable: "[0,3]", highlight: "[0]", others: '"hidden"' });
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
  assert.equal(subjectTitle(s), "Scale · C major · pentatonic, 1–2");
  assert.equal(subjectName(s), "Scale · pentatonic, 1–2");
});
