import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeyChoice } from "@/features/creator/model/key";
import { findPentatonic } from "@/features/theory/pentatonics";
import { CAGED_LETTERS } from "@/lib/chordKit/caged";
import { POSITION_COUNT } from "@/lib/chordKit/scalePositions";
import { arpTypeOf } from "@/lib/chordKit/arpeggios";
import { FAMILIES, arpChordSymbol, melodyLabel, melodyPlace, melodyTune, nextMelody, addableValues, allOptions, describeSubject, familyOf, isAll, stepValues, toggleAll, toggleOption, updateSubject, visibleControls } from "./families";
import { subjectName, subjectTitle, type Subject } from "./subject";

const C_MAJOR: KeyChoice = { tonicPc: 0, family: 0, mode: 0 };
const A_MINOR: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
const D_DORIAN: KeyChoice = { tonicPc: 2, family: 0, mode: 1 };
const family = (id: string) => FAMILIES.find((f) => f.id === id)!;

test("the families, in the palette's order", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), [
    "scale", "caged", "arpeggio", "chord-shapes", "staff", "melody",
    "relative-modes", "mode-intervals", "key-chords", "triads", "progressions", "chord-circle", "circle-of-fifths", "piano-keys", "improvisation", "tunings",
    "backing-band", "note-finder", "interval-ears", "string-singer", "interval-singer", "breathwork", "finger-pattern", "picking-drill", "legato-trill", "strum-along",
  ]);
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
  assert.equal(describeSubject({ kind: "tool", tool: { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["E", "A"] } }), "CAGED · C major · E, A shapes");
  assert.equal(describeSubject({ kind: "tool", tool: { type: "caged-neck", key: 2, scale: "dorian", shapes: ["E"] } }), "CAGED · D minor · E shape");
  assert.equal(describeSubject({ kind: "tool", tool: { type: "caged-neck", key: 0, scale: "major-ionian" } }), "CAGED · C major · whole neck");
});

test("subjects outside the families have no row text", () => {
  assert.equal(describeSubject({ kind: "key" }), null);
  assert.equal(describeSubject({ kind: "chord", symbol: "Am" }), null);
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
  const tool = (s: Subject) => (s as Extract<Subject, { kind: "tool" }>).tool;
  assert.deepEqual(tool(family("caged").make({ shapes: ["E", "C"] }, C_MAJOR)), { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["C", "E"] });
  assert.deepEqual(tool(family("caged").make({ shapes: ["overview"] }, C_MAJOR)), { type: "caged-neck", key: 0, scale: "major-ionian" });
  assert.deepEqual(family("caged").read({ kind: "tool", tool: { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["G"] } }), { shapes: ["G"] });
  assert.deepEqual(family("caged").read({ kind: "tool", tool: { type: "caged-neck", key: 0, scale: "major-ionian" } }), { shapes: ["overview"] });
});

test("a CAGED widget's shapes change in CAGED order", () => {
  const one = family("caged").make({ shapes: ["G"] }, C_MAJOR);
  assert.equal(familyOf(one)?.id, "caged");
  assert.equal(describeSubject(one), "CAGED · C major · G shape");
  assert.deepEqual((updateSubject(one, { shapes: ["E", "G"] }) as Extract<Subject, { kind: "tool" }>).tool, { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["G", "E"] });
});

test("an arpeggio starts on the key's own 7th chord, every position", () => {
  const s = family("arpeggio").make({}, A_MINOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am7", show: ["positions"] } });
  assert.equal(describeSubject(s), "Arpeggio · Am7 · all positions");
});

test("an arpeggio is the chord its values name, and reads back as that chord on its own root", () => {
  // D dorian: D E F G A B C, so degree 4 is A; m7b5 on it is Am7b5
  const s = family("arpeggio").make({ key: 2, scale: "dorian", degree: 4, type: "m7b5", show: ["neck"], roots: [5, 4] }, C_MAJOR);
  assert.deepEqual(s, { kind: "tool", tool: { type: "arpeggio-neck", chord: "Am7b5", show: ["neck"], roots: [5, 4] } });
  assert.deepEqual(family("arpeggio").read(s), { key: 9, scale: "natural-minor-aeolian", degree: 0, type: "m7b5", show: ["neck"], roots: [5, 4] });
  assert.equal(describeSubject(s), "Arpeggio · Am7b5 · neck");
  assert.equal(describeSubject(family("arpeggio").make({ key: 2, scale: "dorian", degree: 4, type: "m7b5", show: ["neck", "positions"], roots: [5, 4] }, C_MAJOR)), "Arpeggio · Am7b5 · neck, root on 5th, 4th");
});

test("an arpeggio's chord list is named in the key and scale picked, and root strings show only with positions", () => {
  const arp = family("arpeggio");
  const on = (values: Record<string, string | number | string[] | number[]>) => visibleControls(arp, values).find((c) => c.name === "degree")!.options!;
  assert.deepEqual(on({ key: 7, scale: "major-ionian" })[4], { value: 4, label: "V · D" });
  assert.deepEqual(on({ key: 9, scale: "natural-minor-aeolian" })[0], { value: 0, label: "i · A" });
  assert.ok(visibleControls(arp, { show: ["positions"] }).some((c) => c.name === "roots"));
  assert.ok(!visibleControls(arp, { show: ["neck"] }).some((c) => c.name === "roots"));
});

test("an arpeggio made on a stage with no root is in C until a key is picked", () => {
  const none: KeyChoice = { tonicPc: null, family: 0, mode: 0 };
  const arp = family("arpeggio");
  assert.equal(arp.read(arp.make({}, none))!.key, 0);
  assert.equal(arp.read(arp.make({ ...stepValues(arp, none), key: 7 }, none))!.key, 7);
});

test("changing an arpeggio's key on it pins its tonic; other changes don't", () => {
  const arp = family("arpeggio").make({}, C_MAJOR);
  assert.equal("pinned" in updateSubject(arp, { degree: 3, type: "triad", roots: [6] }), false);
  assert.deepEqual((updateSubject(arp, { key: 7 }) as Extract<Subject, { kind: "tool" }>).pinned, ["tonic"]);
});

test("a typed-chord arpeggio reads as the family and stays until really changed", () => {
  const g9: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "G9", boxes: [2, 3] } };
  assert.equal(describeSubject(g9), "Arpeggio · G9 · boxes 2, 3");
  assert.deepEqual(family("arpeggio").read(g9), { key: 7, scale: "major-ionian", degree: 0, type: "7", show: ["positions"], roots: [6, 5, 4, 3, 2] });
  // closing its editor sends back what it read: nothing changes
  assert.equal(updateSubject(g9, family("arpeggio").read(g9)!), g9);
  // a root string ticked keeps G9; it has no page view, so it stays the box view it was
  assert.deepEqual((updateSubject(g9, { roots: [6] }) as Extract<Subject, { kind: "tool" }>).tool, { type: "arpeggio-neck", chord: "G9", boxes: [2, 3] });
  // a new type makes a new chord on the same root
  assert.equal(((updateSubject(g9, { type: "maj7" }) as Extract<Subject, { kind: "tool" }>).tool as { chord: string }).chord, "Gmaj7");
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
  const caged: Subject = { kind: "tool", tool: { type: "caged-neck", key: 2, scale: "dorian" }, pinned: ["tonic"] };
  assert.deepEqual(updateSubject(caged, { shapes: ["A", "D"] }), { kind: "tool", tool: { type: "caged-neck", key: 2, scale: "dorian", shapes: ["A", "D"] }, pinned: ["tonic"] });
  const outside: Subject = { kind: "key" };
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
  assert.deepEqual(stepValues(family("arpeggio"), A_MINOR), { key: 9, scale: "natural-minor-aeolian", degree: 0, type: "m7", show: ["positions"], roots: [6, 5, 4, 3, 2] });
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

test("a melody is picked by its name and number, in the key, and reads back the same", () => {
  const s = family("melody").make({ stage: "mi", index: 3, voice: "alto" }, D_DORIAN);
  assert.deepEqual(s, { kind: "tool", tool: { type: "melody-singer", tune: melodyTune("mi", 3), key: 2, voice: "alto" } });
  assert.deepEqual(family("melody").read(s), { key: 2, stage: "mi", index: 3, voice: "alto" });
  assert.equal(describeSubject(s), "Melody · D major · Do Re Mi 3, alto");
  assert.equal(familyOf(s)?.id, "melody");
});

test("a melody's number past its last tune is its last; the Number control lists its tunes", () => {
  const last = melodyTune("do-re", 99);
  assert.equal(melodyPlace(last)?.stage, "do-re");
  assert.equal(melodyPlace(last)?.index, melodyPlace(last)?.count);
  const index = visibleControls(family("melody"), { stage: "mi" }).find((c) => c.name === "index")!;
  assert.equal(index.options!.length, melodyPlace(melodyTune("mi", 1))!.count);
});

test("next melody walks the book and wraps round", () => {
  const first = melodyTune("do-re", 1);
  assert.equal(nextMelody(first), melodyTune("mi", 1));
  assert.equal(melodyLabel(nextMelody(first)), "Do Re Mi 1");
  let n = first, steps = 0;
  do { n = nextMelody(n); steps++; } while (n !== first && steps < 1000);
  assert.equal(n, first);
});

test("a melody's new name starts at its first tune; a picked key pins the tonic", () => {
  const s = family("melody").make({ stage: "mi", index: 4 }, C_MAJOR);
  const moved = updateSubject(s, { stage: "fa" });
  assert.deepEqual(family("melody").read(moved), { key: 0, stage: "fa", index: 1, voice: "baritone" });
  const keyed = updateSubject(s, { key: 7 });
  assert.deepEqual(keyed, { kind: "tool", tool: { type: "melody-singer", tune: melodyTune("mi", 4), key: 7, voice: "baritone" }, pinned: ["tonic"] });
});

const G_MIXOLYDIAN: KeyChoice = { tonicPc: 7, family: 0, mode: 4 };
const toolMade = (id: string, v: Record<string, unknown>, key: KeyChoice) => {
  const s = family(id).make(v as never, key);
  assert.equal(s.kind, "tool");
  return (s as Extract<Subject, { kind: "tool" }>).tool as unknown as Record<string, unknown>;
};

test("arpChordSymbol: the scale chord the Arpeggio family's values name", () => {
  // npm run -s theory -- scale C major: ii is Dm, Dm7; G mixolydian: I7 is G7
  assert.equal(arpChordSymbol(C_MAJOR, 1, "triad"), "Dm");
  assert.equal(arpChordSymbol(C_MAJOR, 1, "seventh"), "Dm7");
  assert.equal(arpChordSymbol(G_MIXOLYDIAN, 0, "seventh"), "G7");
  assert.equal(arpChordSymbol(C_MAJOR, 0, "ninth"), "Cmaj9");
  assert.equal(arpChordSymbol(C_MAJOR, 1, "ninth"), "Dm9");
  assert.equal(arpChordSymbol(C_MAJOR, 4, "min"), "Gm");
});

test("arpChordSymbol makes a chord the arpeggio-neck can draw for every quality", () => {
  for (const q of ["maj", "min", "dim", "aug", "maj7", "7", "m7", "m7b5", "dim7", "mmaj7"]) assert.equal(arpTypeOf(arpChordSymbol(C_MAJOR, 0, q)), q, q);
});

test("the CAGED family makes a caged-neck in the key's scale", () => {
  assert.deepEqual(toolMade("caged", { shapes: ["E"] }, C_MAJOR), { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["E"] });
  assert.deepEqual(toolMade("caged", {}, A_MINOR), { type: "caged-neck", key: 9, scale: "natural-minor-aeolian" });
});

test("a CAGED widget keeps its minor scale when its shapes change", () => {
  const s: Subject = { kind: "tool", tool: { type: "caged-neck", key: 9, scale: "natural-minor-aeolian" } };
  const u = updateSubject(s, { shapes: ["C"] }) as Extract<Subject, { kind: "tool" }>;
  assert.deepEqual(u.tool, { type: "caged-neck", key: 9, scale: "natural-minor-aeolian", shapes: ["C"] });
});

test("the Arpeggio family makes an arpeggio-neck on the scale chord", () => {
  const t = toolMade("arpeggio", { key: 0, scale: "major-ionian", degree: 1, type: "seventh", show: ["positions"], roots: [6, 5] }, C_MAJOR);
  assert.deepEqual(t, { type: "arpeggio-neck", chord: "Dm7", show: ["positions"], roots: [6, 5] });
});

test("a key panel and the chord circle are tools in the key", () => {
  assert.deepEqual(toolMade("triads", {}, A_MINOR), { type: "triads", key: 9, scale: "natural-minor-aeolian" });
  assert.deepEqual(toolMade("chord-circle", { degree: 5 }, C_MAJOR), { type: "chord-circle", key: 0, scale: "major-ionian", degree: 5 });
  assert.match(describeSubject({ kind: "tool", tool: { type: "triads", key: 9, scale: "natural-minor-aeolian" } }) ?? "", /^Triads · A/);
});

test("a practice family makes its tool at the level picked", () => {
  assert.equal(toolMade("note-finder", { level: "advanced" }, C_MAJOR).level, "advanced");
  assert.equal(toolMade("finger-pattern", { level: "beginner", bpm: 90 }, C_MAJOR).bpm, 90);
  assert.equal(toolMade("backing-band", {}, G_MIXOLYDIAN).key, 7);
  assert.deepEqual(toolMade("strum-along", {}, C_MAJOR).chords, ["C", "G", "Am", "F"]);
});

test("final: ticking Show or Root on an arpeggio keeps its chord", () => {
  const g9: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "G9", boxes: [2, 3] } };
  assert.equal(((updateSubject(g9, { show: ["neck"] }) as Extract<Subject, { kind: "tool" }>).tool as { chord: string }).chord, "G9");
  const cs: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "C#m", show: ["positions"] } };
  const u = updateSubject(cs, { roots: [6] }) as Extract<Subject, { kind: "tool" }>;
  assert.deepEqual(u.tool, { type: "arpeggio-neck", chord: "C#m", show: ["positions"], roots: [6] });
});

test("final: a practice tool keeps what its controls don't set", () => {
  const up = (tool: Record<string, unknown>, values: Record<string, unknown>) => (updateSubject({ kind: "tool", tool: tool as never }, values as never) as Extract<Subject, { kind: "tool" }>).tool as unknown as Record<string, unknown>;
  assert.deepEqual(up({ type: "strum-along", chords: ["Am", "Em", "F", "Dm"], bpm: 80 }, { bpm: 100 }).chords, ["Am", "Em", "F", "Dm"]);
  assert.deepEqual(up({ type: "backing-band", bpm: 80, key: 0, parts: { click: "always", drone: "off" } }, { bpm: 100 }).parts, { click: "always", drone: "off" });
  assert.deepEqual(up({ type: "backing-band", bpm: 80, key: 0, parts: { click: "always", drone: "off" } }, { parts: ["click", "drone", "bass"] }).parts, { click: "always", drone: "off", bass: "on" });
  const t = up({ type: "legato-trill", fingers: "13", string: 2, fret: 7, bpm: 60, level: "beginner" }, { level: "advanced" });
  assert.deepEqual([t.string, t.fret, t.level], [2, 7, "advanced"]);
});
