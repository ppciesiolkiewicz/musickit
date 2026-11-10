import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { groupResults, paletteCatalog, paletteChoice, searchPalette } from "./search";
import { FAMILIES } from "./families";
import { followMaster, isControl, takesMic, isPage, keyOf, pinAgainst, sanitiseSubject, subjectIdentity, subjectTitle, withKey, withMaster, withOwnKey, type Subject } from "./subject";

const ids = ["scale", "chords", "circle", "keys", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];
const E_MINOR = { tonicPc: 4, family: 0, mode: 5 };
const A_DORIAN = { tonicPc: 9, family: 0, mode: 1 };

const add = (q: string, stageKey = EMPTY_KEY) =>
  searchPalette(q, ids, stageKey).map((r) => (r.action.type === "add" ? r.action.subject : r.action.type === "family" ? `family:${r.action.familyId}` : r.action.command));
const first = (q: string, stageKey = EMPTY_KEY) => add(q, stageKey)[0];

const familyRows = (q: string, stageKey = EMPTY_KEY) => searchPalette(q, ids, stageKey).flatMap((r) => (r.action.type === "family" ? [r.action] : []));

test("a key with a mode lists the families that take it, one row each, in that key", () => {
  const r = searchPalette("a dorian", ids, E_MINOR);
  assert.ok(r.length > 0);
  assert.ok(r.every((x) => x.action.type === "family"));
  const fams = familyRows("a dorian", E_MINOR);
  assert.deepEqual(fams.map((f) => f.familyId), FAMILIES.map((f) => f.id));
  for (const f of fams) assert.deepEqual(f.key, A_DORIAN);
  assert.equal(fams[0].familyId, "scale");
});

test("a mode alone lists the families, never a command or a flat list of boxes, on the master's root (even none)", () => {
  for (const q of ["ionian", "dorian", "major"]) {
    const r = searchPalette(q, ids, EMPTY_KEY);
    assert.ok(r.length > 0, q);
    assert.ok(r.every((x) => x.action.type === "family"), q);
  }
  assert.deepEqual(familyRows("dorian")[0].key, { tonicPc: null, family: 0, mode: 1 });
  assert.deepEqual(familyRows("ionian", E_MINOR)[0].key, { tonicPc: 4, family: 0, mode: 0 });
  assert.equal(new Set(familyRows("ionian").map((f) => f.familyId)).size, familyRows("ionian").length);
});

test("a mode without a root uses the master's root and pins only the scale", () => {
  // a Scale widget's scale is its own: E Phrygian on the neck, the root following the master
  assert.deepEqual(first("phrygian fretboard", E_MINOR), { kind: "tool", tool: { type: "scale-neck", scale: "phrygian", key: 4, boxes: [1, 2, 3, 4, 5], neck: true, positions: false } });
});

test("pentatonic box and scale position rows are gone from the search; the Scale family is offered", () => {
  const r = add("pent pos 2");
  assert.ok(!r.some((s) => typeof s === "object" && s.kind === "tool"));
  assert.ok(add("pentatonic").includes("family:scale"));
  assert.ok(!add("scale pos 3").some((s) => typeof s === "object" && s.kind === "tool"));
});

test("e shape is a CAGED box as the CAGED family makes it, and its letter is not read as the root", () => {
  assert.deepEqual(add("e shape", E_MINOR), [{ kind: "caged", key: E_MINOR, shape: "E" }]);
  assert.deepEqual(first("e shape"), { kind: "caged", key: EMPTY_KEY, shape: "E" });
  assert.deepEqual(first("a minor c shape", E_MINOR), { kind: "caged", key: { tonicPc: 9, family: 0, mode: 5 }, shape: "C", pinned: ["tonic"] });
});

test("caged finds the CAGED family, the overview, the fretboard, the five boxes and the page", () => {
  const all = add("caged", E_MINOR);
  assert.ok(all.includes("family:caged"));
  const r = all.filter((s) => typeof s === "object") as Subject[];
  assert.ok(r.some((s) => s.kind === "plugin" && s.plugin === "caged" && !s.full));
  assert.deepEqual(r.filter((s) => s.kind === "caged").map((s) => (s as { shape: string | null }).shape), [null, "C", "A", "G", "E", "D"]);
  assert.ok(r.some((s) => s.kind === "plugin" && s.plugin === "caged" && s.full));
});

test("sus gives one circle diagram per chord; a Roman numeral picks one", () => {
  assert.deepEqual(add("sus", E_MINOR).map((s) => (s as { degree: number }).degree), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(add("sus iv", E_MINOR), [{ kind: "bubble", key: E_MINOR, degree: 3 }]);
});

test("3nps box 2 gives the second three-notes-per-string position", () => {
  assert.deepEqual(first("c major 3nps box 2"), { kind: "position", key: { tonicPc: 0, family: 0, mode: 0 }, positionKind: "3nps", index: 1, pinned: ["tonic"] });
});

test("circle g is the circle panel in G major", () => {
  assert.deepEqual(first("circle g"), { kind: "plugin", plugin: "circle", key: { tonicPc: 7, family: 0, mode: 0 }, pinned: ["tonic"] });
});

test("metronome and drone find the metronome", () => {
  assert.equal((first("metronome", E_MINOR) as Subject).kind, "band");
  assert.equal((first("drone", E_MINOR) as Subject).kind, "band");
});

test("mic, microphone, guitar and audio find the audio input", () => {
  assert.deepEqual(first("mic"), { kind: "mic" });
  assert.deepEqual(first("microphone"), { kind: "mic" });
  assert.deepEqual(first("audio input"), { kind: "mic" });
});

test("tuner finds the tuner; key finds Key & scale", () => {
  assert.deepEqual(first("tuner"), { kind: "tuner" });
  assert.deepEqual(first("key"), { kind: "key" });
});

test("chords finds the chords in the key and the whole chords page; there is no single-chord widget", () => {
  const r = add("chords", E_MINOR) as Subject[];
  assert.ok(r.some((s) => s.kind === "section" && s.section === "chords"));
  assert.ok(r.some((s) => s.kind === "plugin" && s.plugin === "chords" && s.full));
  assert.ok(!add("e6").some((s) => typeof s === "object" && s.kind === "chord"));
});

test("page finds the cheatsheet pages", () => {
  const r = add("triads page", E_MINOR) as Subject[];
  assert.deepEqual(r[0], { kind: "plugin", plugin: "triads", full: true, key: E_MINOR });
});

test("relative modes and intervals are palette items of their own; whole neck the fretboard", () => {
  assert.deepEqual(first("same notes", E_MINOR), { kind: "section", section: "relatives", key: E_MINOR });
  assert.deepEqual(first("relative modes", E_MINOR), { kind: "section", section: "relatives", key: E_MINOR });
  assert.deepEqual(first("intervals", E_MINOR), { kind: "plugin", plugin: "scale", key: E_MINOR });
  assert.deepEqual(first("whole neck", E_MINOR), { kind: "tool", tool: { type: "scale-neck", scale: "natural-minor-aeolian", key: 4, boxes: [1, 2, 3, 4, 5], neck: true, positions: false } });
  assert.ok(add("overview", E_MINOR).some((s) => typeof s === "object" && s.kind === "tool" && s.tool.type === "scale-neck" && s.tool.neck === true && s.tool.positions === undefined));
  assert.ok(add("scale", E_MINOR).includes("family:scale"));
});

test("typed names of the Scale family's single widgets keep their own labels", () => {
  const label = (q: string) => searchPalette(q, ids, E_MINOR)[0].label;
  assert.equal(label("3nps pos 6"), "3 notes per string, position 6");
});

test("camera c offers camera corner", () => {
  assert.ok(add("camera c").includes("camera-corner"));
  assert.ok(add("screen").includes("screen-share"));
});

test("nonsense gives nothing and never throws", () => {
  for (const q of ["", "   ", "hello", "h7", "x dorian", "/", "pos 9", "drone h", "%%%"]) assert.doesNotThrow(() => searchPalette(q, ids, EMPTY_KEY));
  assert.equal(searchPalette("hello", ids, EMPTY_KEY).length, 0);
  assert.equal(searchPalette("", ids, EMPTY_KEY).length, 0);
});

test("at most 12 results, with unique ids", () => {
  for (const q of ["c", "a pentatonic", "fretboard", "page"]) {
    const r = searchPalette(q, ids, EMPTY_KEY);
    assert.ok(r.length <= 12, q);
    assert.equal(new Set(r.map((x) => x.id)).size, r.length, q);
  }
});

test("the catalog lists every widget in the master key, by section, plus camera and screen share", () => {
  const c = paletteCatalog(ids, E_MINOR);
  const subjects = c.flatMap((r) => (r.action.type === "add" ? [r.action.subject] : []));
  assert.deepEqual(subjects[0], { kind: "key" });
  assert.ok(subjects.some((s) => s.kind === "band"));
  assert.ok(subjects.some((s) => s.kind === "tuner"));
  assert.ok(subjects.some((s) => s.kind === "section" && s.section === "chords"));
  // no per-box rows and no Scale views: one row per family (Scale holds the neck and positions); relative modes and intervals are rows of their own
  assert.ok(!subjects.some((s) => ["position", "caged", "tool", "neck"].includes(s.kind)));
  assert.ok(!subjects.some((s) => s.kind === "section" && s.section !== "chords" && s.section !== "relatives"));
  assert.ok(subjects.some((s) => s.kind === "section" && s.section === "relatives"));
  assert.ok(subjects.some((s) => s.kind === "plugin" && s.plugin === "scale" && !s.full));
  const fams = c.flatMap((r) => (r.action.type === "family" ? [r.action] : []));
  assert.deepEqual(fams.map((f) => f.familyId), ["scale", "staff", "melody", "chord-shapes", "arpeggio", "caged"]);
  assert.deepEqual(fams.map((f) => f.familyId).sort(), FAMILIES.map((f) => f.id).sort());
  for (const f of fams) assert.deepEqual(f.key, E_MINOR);
  assert.equal(subjects.filter((s) => s.kind === "bubble").length, 7);
  assert.equal(subjects.filter((s) => s.kind === "plugin" && s.full).length, 10);
  // the compact chords and modes panels repeat Chords in the key and Modes with the same notes; no single chords
  assert.ok(!subjects.some((s) => s.kind === "plugin" && !s.full && (s.plugin === "chords" || s.plugin === "modes")));
  assert.ok(!subjects.some((s) => s.kind === "chord"));
  for (const s of subjects) if ("key" in s) assert.deepEqual(s.key, E_MINOR);
  assert.ok(c.some((r) => r.action.type === "command" && r.action.command === "camera-corner"));
  assert.equal(new Set(c.map((r) => r.id)).size, c.length);
});

test("the catalog comes in section order, each section in one run, subsections together", () => {
  const c = paletteCatalog(ids, E_MINOR);
  assert.deepEqual([...new Set(c.map((r) => r.group))], ["setup", "scale", "chords", "caged", "theory", "pages", "text", "brand", "studio"]);
  assert.deepEqual(c.filter((r) => r.group === "scale").map((r) => r.label), ["Scale", "Relative modes", "Intervals within each mode", "Staff", "Melody"]);
  assert.deepEqual(groupResults(c).flatMap((g) => g.results), c);
});

test("ranked groups keep the best result first", () => {
  const r = searchPalette("caged", ids, E_MINOR);
  const g = groupResults(r, true);
  assert.equal(g[0].results[0], r[0]);
  assert.equal(g.flatMap((x) => x.results).length, r.length);
});

const commandsOf = (r: ReturnType<typeof paletteCatalog>) => r.flatMap((x) => (x.action.type === "command" ? [`${x.label}=${x.action.command}`] : []));
test("the catalog offers Camera and Screen share when neither is on the stage", () => {
  assert.deepEqual(commandsOf(paletteCatalog(ids, EMPTY_KEY, { camera: "none", screen: "none" })), ["Camera=camera-corner", "Screen share=screen-share"]);
});

test("with them on the stage it offers close, and fullscreen or minimize, whichever is not the current one", () => {
  assert.deepEqual(commandsOf(paletteCatalog(ids, EMPTY_KEY, { camera: "corner", screen: "full" })), [
    "Fullscreen camera=camera-full",
    "Close camera=camera-off",
    "Minimize screen share=screen-corner",
    "Close screen share=screen-stop",
  ]);
});

test("search offers the same names, and only the ones that apply", () => {
  const none = { camera: "none" as const, screen: "none" as const };
  const on = { camera: "full" as const, screen: "corner" as const };
  assert.ok(commandsOf(searchPalette("camera", ids, EMPTY_KEY, none)).includes("Camera=camera-corner"));
  assert.ok(!commandsOf(searchPalette("close", ids, EMPTY_KEY, none)).some((c) => c.startsWith("Close")));
  assert.ok(commandsOf(searchPalette("close cam", ids, EMPTY_KEY, on)).includes("Close camera=camera-off"));
  assert.ok(commandsOf(searchPalette("minimize", ids, EMPTY_KEY, on)).includes("Minimize camera=camera-corner"));
  assert.ok(commandsOf(searchPalette("full screen", ids, EMPTY_KEY, on)).includes("Fullscreen screen share=screen-full"));
  // the old phrases still work
  assert.ok(commandsOf(searchPalette("camera off", ids, EMPTY_KEY, on)).includes("Close camera=camera-off"));
});

test("commands whose names start with the typed words come first: screen is Screen share, not Fullscreen camera", () => {
  const corner = { camera: "corner" as const, screen: "none" as const };
  assert.equal(commandsOf(searchPalette("screen", ids, EMPTY_KEY, corner))[0], "Screen share=screen-share");
  assert.equal(commandsOf(searchPalette("full", ids, EMPTY_KEY, corner))[0], "Fullscreen camera=camera-full");
});


test("withKey re-keys key-aware subjects and leaves chord, tuner, camera, screen and key alone", () => {
  const k = { tonicPc: 2, family: 0, mode: 1 };
  const keyed: Subject[] = [
    { kind: "plugin", plugin: "scale", key: EMPTY_KEY },
    { kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: 0 },
    { kind: "band", key: EMPTY_KEY },
    { kind: "section", section: "chords", key: EMPTY_KEY },
    { kind: "bubble", key: EMPTY_KEY, degree: 2 },
    { kind: "neck", key: EMPTY_KEY },
    { kind: "caged", key: EMPTY_KEY, shape: null },
  ];
  for (const s of keyed) assert.deepEqual(keyOf(withKey(s, k)), k);
  const fixed: Subject[] = [{ kind: "chord", symbol: "E6" }, { kind: "camera" }, { kind: "screen" }, { kind: "key" }, { kind: "tuner" }];
  for (const s of fixed) assert.equal(withKey(s, k), s);
});

test("the master moves what is not pinned: a pinned scale keeps its mode and follows the root", () => {
  const dorian: Subject = { kind: "neck", key: A_DORIAN, pinned: ["scale"] };
  assert.deepEqual(withMaster(dorian, { tonicPc: 0, family: 0, mode: 0 }), { kind: "neck", key: { tonicPc: 0, family: 0, mode: 1 }, pinned: ["scale"] });
  const free: Subject = { kind: "neck", key: A_DORIAN };
  assert.deepEqual(withMaster(free, E_MINOR), { kind: "neck", key: E_MINOR });
  const g: Subject = { kind: "neck", key: { tonicPc: 7, family: 0, mode: 0 }, pinned: ["tonic"] };
  assert.deepEqual(keyOf(withMaster(g, E_MINOR)), { tonicPc: 7, family: 0, mode: 5 });
});

test("changing the key on the widget pins what changed; follow drops the pins", () => {
  const s: Subject = { kind: "neck", key: E_MINOR };
  const m = withOwnKey(s, { tonicPc: 4, family: 0, mode: 2 });
  assert.deepEqual(m, { kind: "neck", key: { tonicPc: 4, family: 0, mode: 2 }, pinned: ["scale"] });
  assert.deepEqual(withOwnKey(m, { tonicPc: 7, family: 0, mode: 2 }), { kind: "neck", key: { tonicPc: 7, family: 0, mode: 2 }, pinned: ["scale", "tonic"] });
  assert.deepEqual(followMaster(m, A_DORIAN), { kind: "neck", key: A_DORIAN });
  assert.deepEqual(pinAgainst(s, E_MINOR), s);
});

test("subject titles name the widget and its scale, not the master's root", () => {
  assert.equal(subjectTitle({ kind: "plugin", plugin: "scale", key: A_DORIAN }), "Intervals within each mode · Dorian");
  assert.equal(subjectTitle({ kind: "section", section: "relatives", key: A_DORIAN }), "Relative modes · Dorian");
  assert.equal(subjectTitle({ kind: "plugin", plugin: "chords", full: true, key: A_DORIAN }), "Chords page · Dorian");
  assert.equal(subjectTitle({ kind: "position", key: E_MINOR, positionKind: "pentatonic", index: 0 }), "Pentatonic box 1 · Aeolian");
  assert.equal(subjectTitle({ kind: "band", key: E_MINOR }), "Metronome");
  assert.equal(subjectTitle({ kind: "band", key: E_MINOR, pinned: ["tonic"] }), "Metronome · E");
  assert.equal(subjectTitle({ kind: "neck", key: A_DORIAN, pinned: ["tonic", "scale"] }), "Fretboard · A Dorian");
  assert.equal(subjectTitle({ kind: "caged", key: A_DORIAN, shape: "C" }), "CAGED C shape (root on A) · minor");
  assert.equal(subjectTitle({ kind: "caged", key: E_MINOR, shape: null }), "CAGED fretboard · minor");
  assert.equal(subjectTitle({ kind: "bubble", key: E_MINOR, degree: 1 }), "Sus & extensions · ii° · Aeolian");
  assert.equal(subjectTitle({ kind: "key" }), "Key & scale");
  assert.equal(subjectTitle({ kind: "tuner" }), "Tuner");
  assert.equal(subjectTitle({ kind: "mic" }), "Audio input");
});

test("Key & scale, the metronome, the tuner and the audio input are controls; the rest are not", () => {
  assert.deepEqual(paletteCatalog(ids, E_MINOR).flatMap((r) => (r.action.type === "add" && isControl(r.action.subject) ? [r.label] : [])), ["Key & scale", "Metronome", "Tuner", "Audio input"]);
});

test("the whole cheatsheet pages, Fretboard positions and Chords in the key are pages; the rest are not", () => {
  const pages = paletteCatalog(ids, E_MINOR).flatMap((r) => (r.action.type === "add" && isPage(r.action.subject) ? [r.action.subject] : []));
  assert.ok(isPage({ kind: "section", section: "guitar", key: E_MINOR }));
  assert.ok(!isPage({ kind: "section", section: "relatives", key: E_MINOR }));
  assert.ok(pages.some((s) => s.kind === "section" && s.section === "chords"));
  assert.ok(pages.every((s) => (s.kind === "plugin" && s.full) || (s.kind === "section" && s.section !== "relatives")));
  assert.equal(isPage({ kind: "neck", key: E_MINOR }), false);
});

test("identity ignores the key, so a ticked row stays ticked when the widget's key changes", () => {
  assert.equal(subjectIdentity({ kind: "neck", key: E_MINOR }), subjectIdentity({ kind: "neck", key: A_DORIAN, pinned: ["scale"] }));
  assert.notEqual(subjectIdentity({ kind: "bubble", key: E_MINOR, degree: 1 }), subjectIdentity({ kind: "bubble", key: E_MINOR, degree: 2 }));
  assert.notEqual(subjectIdentity({ kind: "plugin", plugin: "caged", key: E_MINOR }), subjectIdentity({ kind: "plugin", plugin: "caged", full: true, key: E_MINOR }));
});

test("sanitiseSubject drops unknown plugins and bad shapes, keeps pins and full pages", () => {
  assert.equal(sanitiseSubject({ kind: "plugin", plugin: "gone", key: EMPTY_KEY }, ids), null);
  assert.equal(sanitiseSubject({ kind: "chord" }, ids), null);
  assert.equal(sanitiseSubject("junk", ids), null);
  assert.equal(sanitiseSubject({ kind: "section", section: "nope", key: EMPTY_KEY }, ids), null);
  assert.equal(sanitiseSubject({ kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: -1 }, ids), null);
  assert.deepEqual(sanitiseSubject({ kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } }, ids), { kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } });
  assert.deepEqual(sanitiseSubject({ kind: "plugin", plugin: "scale", key: { tonicPc: 99 } }, ids), { kind: "plugin", plugin: "scale", key: EMPTY_KEY });
  assert.deepEqual(sanitiseSubject({ kind: "plugin", plugin: "chords", full: true, key: E_MINOR, pinned: ["scale", "junk"] }, ids), { kind: "plugin", plugin: "chords", full: true, key: E_MINOR, pinned: ["scale"] });
  assert.deepEqual(sanitiseSubject({ kind: "camera" }, ids), { kind: "camera" });
  assert.deepEqual(sanitiseSubject({ kind: "tuner" }, ids), { kind: "tuner" });
  assert.deepEqual(sanitiseSubject({ kind: "mic" }, ids), { kind: "mic" });
  assert.equal(sanitiseSubject({ kind: "caged", key: EMPTY_KEY, shape: "X" }, ids), null);
  assert.deepEqual(sanitiseSubject({ kind: "caged", key: EMPTY_KEY }, ids), { kind: "caged", key: EMPTY_KEY, shape: null });
  assert.equal(sanitiseSubject({ kind: "bubble", key: EMPTY_KEY, degree: 7 }, ids), null);
  // a saved Sus and extensions section comes back as the first chord's diagram
  assert.deepEqual(sanitiseSubject({ kind: "section", section: "sus", key: E_MINOR }, ids), { kind: "bubble", key: E_MINOR, degree: 0 });
});

test("logo and url are in the catalog and found by name; brand finds both", () => {
  const kinds = (r: ReturnType<typeof paletteCatalog>) => r.flatMap((x) => (x.action.type === "add" ? [x.action.subject.kind] : []));
  assert.ok(kinds(paletteCatalog(ids, EMPTY_KEY)).includes("logo"));
  assert.ok(kinds(paletteCatalog(ids, EMPTY_KEY)).includes("url"));
  assert.deepEqual(add("logo"), [{ kind: "logo" }]);
  assert.deepEqual(add("url"), [{ kind: "url" }]);
  assert.deepEqual(add("brand"), [{ kind: "logo" }, { kind: "url" }]);
  assert.equal(sanitiseSubject({ kind: "url" }, ids)?.kind, "url");
  assert.equal(subjectTitle({ kind: "logo" }), "Logo");
});

test("the audio input lights the widgets that draw fretboards and chord boxes", () => {
  const takers = paletteCatalog(ids, E_MINOR).flatMap((r) => (r.action.type === "add" && takesMic(r.action.subject) ? [r.action.subject] : []));
  assert.ok(takers.some((s) => s.kind === "bubble"));
  assert.ok(takesMic({ kind: "neck", key: E_MINOR }));
  assert.ok(takesMic({ kind: "position", key: E_MINOR, positionKind: "3nps", index: 0 }));
  assert.ok(takesMic({ kind: "chord", symbol: "E6" }));
  assert.ok(takesMic({ kind: "section", section: "guitar", key: E_MINOR }));
  assert.ok(!takesMic({ kind: "section", section: "relatives", key: E_MINOR }));
  assert.ok(takesMic({ kind: "plugin", plugin: "caged", key: E_MINOR }));
  assert.ok(takesMic({ kind: "plugin", plugin: "chords", full: true, key: E_MINOR }));
  assert.ok(!takesMic({ kind: "plugin", plugin: "circle", key: E_MINOR }));
  assert.ok(!takesMic({ kind: "caged", shape: "E", key: E_MINOR }));
  for (const kind of ["key", "tuner", "mic", "logo", "url", "camera", "screen"] as const) assert.ok(!takesMic({ kind }), kind);
});

test("Enter in the search always adds, even a widget already on the stage; a click toggles it", () => {
  const eShape = searchPalette("e shape", ids, E_MINOR)[0];
  assert.equal(paletteChoice(eShape, { enter: true, openFamily: null, onStage: true }), "add");
  assert.equal(paletteChoice(eShape, { enter: false, openFamily: null, onStage: true }), "remove");
  assert.equal(paletteChoice(eShape, { enter: false, openFamily: null, onStage: false }), "add");
});

test("with a family open, Enter adds its widget whatever non-family row is active; a family row opens, adds or collapses", () => {
  const metronome = searchPalette("metronome", ids, E_MINOR)[0];
  assert.equal(paletteChoice(metronome, { enter: true, openFamily: "scale", onStage: false }), "add-open");
  assert.equal(paletteChoice(metronome, { enter: false, openFamily: "scale", onStage: false }), "add");
  const scale = paletteCatalog(ids, E_MINOR).find((r) => r.id === "family:scale")!;
  const caged = paletteCatalog(ids, E_MINOR).find((r) => r.id === "family:caged")!;
  assert.equal(paletteChoice(scale, { enter: true, openFamily: "scale", onStage: false }), "add-open");
  assert.equal(paletteChoice(scale, { enter: false, openFamily: "scale", onStage: false }), "collapse");
  assert.equal(paletteChoice(caged, { enter: true, openFamily: "scale", onStage: false }), "open");
  assert.equal(paletteChoice(caged, { enter: false, openFamily: null, onStage: false }), "open");
});
