import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { groupResults, isNoteCommand, paletteCatalog, paletteChoice, searchPalette } from "./search";
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

test("e shape is a CAGED shape as the CAGED family makes it, and its letter is not read as the root", () => {
  assert.deepEqual(add("e shape", E_MINOR), [{ kind: "tool", tool: { type: "caged-neck", key: 4, scale: "natural-minor-aeolian", shapes: ["E"] } }]);
  assert.deepEqual(first("e shape"), { kind: "tool", tool: { type: "caged-neck", key: 0, scale: "major-ionian", shapes: ["E"] } });
  assert.deepEqual(first("a minor c shape", E_MINOR), { kind: "tool", tool: { type: "caged-neck", key: 9, scale: "natural-minor-aeolian", shapes: ["C"] }, pinned: ["tonic"] });
});

test("caged finds the CAGED family, the overview and the five shapes", () => {
  const all = add("caged", E_MINOR);
  assert.ok(all.includes("family:caged"));
  const r = (all.filter((s) => typeof s === "object") as Subject[]).filter((s) => s.kind === "tool" && s.tool.type === "caged-neck") as Extract<Subject, { kind: "tool" }>[];
  assert.deepEqual(r.map((s) => (s.tool as { shapes?: string[] }).shapes?.[0]), [undefined, "C", "A", "G", "E", "D"]);
});

test("sus gives one chord circle per chord; a Roman numeral picks one", () => {
  const tools = (add("sus", E_MINOR).filter((s) => typeof s === "object") as Extract<Subject, { kind: "tool" }>[]).map((s) => s.tool as { degree: number });
  assert.deepEqual(tools.map((t) => t.degree), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(first("sus iv", E_MINOR), { kind: "tool", tool: { type: "chord-circle", key: 4, scale: "natural-minor-aeolian", degree: 4 } });
});

test("3nps box 2 gives the second three-notes-per-string position", () => {
  assert.deepEqual(first("c major 3nps box 2"), { kind: "tool", tool: { type: "position-neck", key: 0, scale: "major-ionian", kind: "3nps", positions: [2] }, pinned: ["tonic"] });
});

test("circle g is the circle of fifths row in G major", () => {
  assert.equal(first("circle g"), "family:circle-of-fifths");
  assert.deepEqual(familyRows("circle g")[0].key, { tonicPc: 7, family: 0, mode: 0 });
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

test("chords finds the chords in the key; there is no single-chord widget and no cheatsheet page", () => {
  const r = add("chords", E_MINOR);
  assert.ok(r.includes("family:key-chords"));
  assert.ok(!r.some((s) => typeof s === "object" && s.kind !== "tool"));
  assert.ok(!add("e6").some((s) => typeof s === "object" && s.kind === "chord"));
});

test("the whole cheatsheet pages are gone from the palette", () => {
  assert.ok(!paletteCatalog(ids, E_MINOR).some((r) => r.group === "pages"));
});

test("relative modes and intervals are rows of their own; whole neck the fretboard", () => {
  assert.equal(first("same notes", E_MINOR), "family:relative-modes");
  assert.equal(first("relative modes", E_MINOR), "family:relative-modes");
  assert.equal(first("intervals", E_MINOR), "family:mode-intervals");
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
  // every widget to look at is a family row; the catalog adds only the controls, text and brand directly
  assert.ok(!subjects.some((s) => s.kind === "tool"));
  const fams = c.flatMap((r) => (r.action.type === "family" ? [r.action] : []));
  assert.deepEqual(fams.map((f) => f.familyId), [
    "scale", "relative-modes", "mode-intervals", "staff", "melody", "chord-shapes", "key-chords", "triads", "arpeggio", "progressions", "chord-circle", "caged",
    "circle-of-fifths", "piano-keys", "improvisation", "tunings",
    "backing-band", "note-finder", "interval-ears", "string-singer", "interval-singer", "breathwork", "finger-pattern", "picking-drill", "legato-trill", "strum-along",
  ]);
  assert.deepEqual(fams.map((f) => f.familyId).sort(), FAMILIES.map((f) => f.id).sort());
  for (const f of fams) assert.deepEqual(f.key, E_MINOR);
  assert.ok(c.some((r) => r.action.type === "command" && r.action.command === "camera-corner"));
  assert.equal(new Set(c.map((r) => r.id)).size, c.length);
});

test("the catalog comes in section order, each section in one run, subsections together", () => {
  const c = paletteCatalog(ids, E_MINOR);
  assert.deepEqual([...new Set(c.map((r) => r.group))], ["setup", "scale", "chords", "caged", "theory", "practice", "text", "video", "brand", "studio"]);
  assert.deepEqual(c.filter((r) => r.group === "scale").map((r) => r.label), ["Scale", "Relative modes", "Intervals of the mode", "Staff", "Melody"]);
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
  // Section is the notes creator's: the catalog lists it first, the studio's palette hides it
  assert.deepEqual(commandsOf(paletteCatalog(ids, EMPTY_KEY, { camera: "none", screen: "none" })), ["Section=section-add", "Video=video-add", "Record a video=video-record", "Camera=camera-corner", "Screen share=screen-share"]);
});

test("with them on the stage it offers close, and fullscreen or minimize, whichever is not the current one", () => {
  assert.deepEqual(commandsOf(paletteCatalog(ids, EMPTY_KEY, { camera: "corner", screen: "full" })), [
    "Section=section-add",
    "Video=video-add",
    "Record a video=video-record",
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
  assert.deepEqual(keyOf(withKey({ kind: "band", key: EMPTY_KEY }, k)), k);
  const fixed: Subject[] = [{ kind: "chord", symbol: "E6" }, { kind: "camera" }, { kind: "screen" }, { kind: "key" }, { kind: "tuner" }];
  for (const s of fixed) assert.equal(withKey(s, k), s);
});

test("the master moves what is not pinned: a pinned tonic stays and takes the master's mode", () => {
  const free: Subject = { kind: "band", key: A_DORIAN };
  assert.deepEqual(withMaster(free, E_MINOR), { kind: "band", key: E_MINOR });
  const g: Subject = { kind: "band", key: { tonicPc: 7, family: 0, mode: 0 }, pinned: ["tonic"] };
  assert.deepEqual(keyOf(withMaster(g, E_MINOR)), { tonicPc: 7, family: 0, mode: 5 });
});

test("changing the key on the widget pins what changed; follow drops the pins", () => {
  const s: Subject = { kind: "band", key: E_MINOR };
  const m = withOwnKey(s, { tonicPc: 4, family: 0, mode: 2 });
  assert.deepEqual(m, { kind: "band", key: { tonicPc: 4, family: 0, mode: 2 }, pinned: ["scale"] });
  assert.deepEqual(withOwnKey(m, { tonicPc: 7, family: 0, mode: 2 }), { kind: "band", key: { tonicPc: 7, family: 0, mode: 2 }, pinned: ["scale", "tonic"] });
  assert.deepEqual(followMaster(m, A_DORIAN), { kind: "band", key: A_DORIAN });
  assert.deepEqual(pinAgainst(s, E_MINOR), s);
});

test("subject titles name the widget; a tool's title is its row text, key included", () => {
  const tool = (t: Record<string, unknown>): Subject => ({ kind: "tool", tool: t as never });
  assert.match(subjectTitle(tool({ type: "relative-modes", key: 9, scale: "dorian" })), /^Relative modes · A /);
  assert.match(subjectTitle(tool({ type: "chord-circle", key: 4, scale: "natural-minor-aeolian", degree: 2 })), /^Sus & extensions · E .* · ii°$/);
  assert.match(subjectTitle(tool({ type: "caged-neck", key: 9, scale: "dorian", shapes: ["C"] })), /^CAGED · A minor · C shape$/);
  assert.equal(subjectTitle({ kind: "band", key: E_MINOR }), "Metronome");
  assert.equal(subjectTitle({ kind: "band", key: E_MINOR, pinned: ["tonic"] }), "Metronome · E");
  assert.equal(subjectTitle({ kind: "key" }), "Key & scale");
  assert.equal(subjectTitle({ kind: "tuner" }), "Tuner");
  assert.equal(subjectTitle({ kind: "mic" }), "Audio input");
});

test("Key & scale, the metronome, the tuner and the audio input are controls; the rest are not", () => {
  assert.deepEqual(paletteCatalog(ids, E_MINOR).flatMap((r) => (r.action.type === "add" && isControl(r.action.subject) ? [r.label] : [])), ["Key & scale", "Metronome", "Tuner", "Audio input"]);
});

test("Chords in the key is a page; the other theory tools are not", () => {
  assert.ok(isPage({ kind: "tool", tool: { type: "key-chords", key: 4, scale: "natural-minor-aeolian" } }));
  assert.ok(!isPage({ kind: "tool", tool: { type: "triads", key: 4, scale: "natural-minor-aeolian" } }));
  assert.ok(!isPage({ kind: "tool", tool: { type: "relative-modes", key: 4, scale: "natural-minor-aeolian" } }));
});

test("identity ignores the key, so a ticked row stays ticked when the widget's key changes", () => {
  const circle = (key: number, degree: number): Subject => ({ kind: "tool", tool: { type: "chord-circle", key, scale: "major-ionian", degree } });
  assert.equal(subjectIdentity(circle(4, 1)), subjectIdentity(circle(9, 1)));
  assert.notEqual(subjectIdentity(circle(4, 1)), subjectIdentity(circle(4, 2)));
});

test("sanitiseSubject drops what it can't read and keeps pins", () => {
  assert.equal(sanitiseSubject({ kind: "chord" }, ids), null);
  assert.equal(sanitiseSubject("junk", ids), null);
  assert.deepEqual(sanitiseSubject({ kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } }, ids), { kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } });
  assert.deepEqual(sanitiseSubject({ kind: "band", key: E_MINOR, pinned: ["scale", "junk"] }, ids), { kind: "band", key: E_MINOR, pinned: ["scale"] });
  assert.deepEqual(sanitiseSubject({ kind: "camera" }, ids), { kind: "camera" });
  assert.deepEqual(sanitiseSubject({ kind: "tuner" }, ids), { kind: "tuner" });
  assert.deepEqual(sanitiseSubject({ kind: "mic" }, ids), { kind: "mic" });
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

test("the headphones notice is in the catalog's Text section and found by name", () => {
  const row = paletteCatalog(ids, EMPTY_KEY).find((r) => r.action.type === "add" && r.action.subject.kind === "headphones");
  assert.equal(row?.group, "text");
  assert.equal(row?.label, "Use headphones");
  assert.deepEqual(add("headphones"), [{ kind: "headphones" }]);
});

test("the video commands are in the catalog's Video section, found by name, and offered to notes", () => {
  const rows = paletteCatalog(ids, EMPTY_KEY).filter((r) => r.group === "video");
  assert.deepEqual(rows.map((r) => r.action.type === "command" && r.action.command), ["video-add", "video-record"]);
  assert.ok(rows.every((r) => r.action.type === "command" && isNoteCommand(r.action.command)));
  assert.equal(isNoteCommand("camera-corner"), false);
  const found = searchPalette("record", ids, EMPTY_KEY);
  assert.ok(found.some((r) => r.action.type === "command" && r.action.command === "video-record"));
});

test("the audio input lights the widgets that draw fretboards and chord boxes", () => {
  const t = (tool: Record<string, unknown>): Subject => ({ kind: "tool", tool: { key: 4, scale: "natural-minor-aeolian", ...tool } as never });
  assert.ok(takesMic(t({ type: "chord-circle", degree: 1 })));
  assert.ok(takesMic(t({ type: "key-chords" })));
  assert.ok(!takesMic(t({ type: "caged-neck" })));
  assert.ok(!takesMic(t({ type: "circle-of-fifths" })));
  assert.ok(!takesMic(t({ type: "relative-modes" })));
  assert.ok(takesMic({ kind: "chord", symbol: "E6" }));
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

test("every catalog row is a family or adds a tool, never a removed kind", () => {
  const removed = new Set(["caged", "arpeggio", "section", "bubble", "plugin", "position", "neck"]);
  for (const r of paletteCatalog(ids, A_DORIAN)) if (r.action.type === "add") assert.ok(!removed.has(r.action.subject.kind), `${r.label}: ${r.action.subject.kind}`);
});

test("3 notes per string is a position-neck", () => {
  const s = first("3nps 2", A_DORIAN) as Subject;
  assert.equal(s.kind, "tool");
  assert.deepEqual((s as Extract<Subject, { kind: "tool" }>).tool, { type: "position-neck", key: 9, scale: "dorian", kind: "3nps", positions: [2] });
});

test("the practice tools sit under Practice", () => {
  assert.ok(paletteCatalog(ids, A_DORIAN).some((r) => r.group === "practice" && r.action.type === "family" && r.action.familyId === "note-finder"));
});
