import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { paletteCatalog, searchPalette } from "./search";
import { keyOf, sanitiseSubject, subjectTitle, withKey, type Subject } from "./subject";

const ids = ["scale", "chords", "circle", "keys", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];
const E_MINOR = { tonicPc: 4, family: 0, mode: 5 };

const add = (q: string, stageKey = EMPTY_KEY) => searchPalette(q, ids, stageKey).map((r) => (r.action.type === "add" ? r.action.subject : r.action.command));

test("a chord symbol gives the chord first", () => {
  const r = searchPalette("/ e6", ids, EMPTY_KEY);
  assert.deepEqual(r[0].action, { type: "add", subject: { kind: "chord", symbol: "E6" } });
  assert.equal(r[0].group, "chord");
});

test("a key with a mode gives the scale plugin first, then the other plugins in that key", () => {
  const r = add("a dorian");
  const a = { tonicPc: 9, family: 0, mode: 1 };
  assert.deepEqual(r[0], { kind: "plugin", plugin: "scale", key: a });
  assert.deepEqual(r[1], { kind: "plugin", plugin: "modes", key: a });
});

test("mode words map to their mode", () => {
  assert.deepEqual(keyOf(add("g major")[0] as Subject), { tonicPc: 7, family: 0, mode: 0 });
  assert.deepEqual(keyOf(add("d minor")[0] as Subject), { tonicPc: 2, family: 0, mode: 5 });
  assert.deepEqual(keyOf(add("f# mixolydian")[0] as Subject), { tonicPc: 6, family: 0, mode: 4 });
  assert.deepEqual(keyOf(add("B♭ lydian")[0] as Subject), { tonicPc: 10, family: 0, mode: 3 });
});

test("minor pent pos 1 is box 0 of E aeolian", () => {
  assert.deepEqual(add("e minor pent pos 1")[0], { kind: "position", key: E_MINOR, positionKind: "pentatonic", index: 0 });
});

test("pent without a box offers boxes 1 to 5", () => {
  const boxes = add("a pentatonic").filter((s) => typeof s === "object" && s.kind === "position");
  assert.deepEqual(boxes.map((s) => (s as { index: number }).index), [0, 1, 2, 3, 4]);
});

test("3nps gives three-notes-per-string positions", () => {
  assert.deepEqual(add("c major 3nps box 2")[0], { kind: "position", key: { tonicPc: 0, family: 0, mode: 0 }, positionKind: "3nps", index: 1 });
});

test("circle g is the circle plugin in G major", () => {
  assert.deepEqual(add("circle g")[0], { kind: "plugin", plugin: "circle", key: { tonicPc: 7, family: 0, mode: 0 } });
});

test("caged alone has no key", () => {
  assert.deepEqual(add("caged")[0], { kind: "plugin", plugin: "caged", key: EMPTY_KEY });
});

test("drone a dorian is the band in A dorian", () => {
  assert.deepEqual(add("drone a dorian")[0], { kind: "band", key: { tonicPc: 9, family: 0, mode: 1 } });
});

test("drone alone uses the stage key", () => {
  assert.deepEqual(add("drone", E_MINOR)[0], { kind: "band", key: E_MINOR });
});

test("every chord g is the chords section in G major", () => {
  assert.deepEqual(add("every chord g")[0], { kind: "section", section: "chords", key: { tonicPc: 7, family: 0, mode: 0 } });
});

test("same notes alone uses the stage key", () => {
  assert.deepEqual(add("same notes", E_MINOR)[0], { kind: "section", section: "relatives", key: E_MINOR });
});

test("key gives the Key widget", () => {
  assert.deepEqual(add("key")[0], { kind: "key" });
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

test("at most 8 results", () => {
  assert.ok(searchPalette("c", ids, EMPTY_KEY).length <= 8);
});

test("results have unique ids", () => {
  const r = searchPalette("a pentatonic", ids, EMPTY_KEY);
  assert.equal(new Set(r.map((x) => x.id)).size, r.length);
});

test("the catalog lists every kind of widget in the stage key, plus camera and screen share", () => {
  const c = paletteCatalog(ids, E_MINOR);
  const subjects = c.flatMap((r) => (r.action.type === "add" ? [r.action.subject] : []));
  assert.deepEqual(subjects[0], { kind: "key" });
  assert.ok(subjects.some((s) => s.kind === "band" && s.key === E_MINOR));
  for (const id of ids) assert.ok(subjects.some((s) => s.kind === "plugin" && s.plugin === id && s.key === E_MINOR), id);
  for (const section of ["chords", "sus", "relatives", "guitar"]) assert.ok(subjects.some((s) => s.kind === "section" && s.section === section), section);
  assert.ok(subjects.some((s) => s.kind === "position" && s.index === 0));
  assert.ok(c.some((r) => r.action.type === "command" && r.action.command === "camera-corner"));
  assert.ok(c.some((r) => r.action.type === "command" && r.action.command === "screen-share"));
  assert.equal(new Set(c.map((r) => r.id)).size, c.length);
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

test("with no stage key, positions use E minor so they can be drawn", () => {
  const pos = paletteCatalog(ids, EMPTY_KEY).flatMap((r) => (r.action.type === "add" && r.action.subject.kind === "position" ? [r.action.subject] : []));
  assert.deepEqual(pos[0].key, E_MINOR);
});

test("withKey re-keys plugin, position, band and section and leaves chord, camera, screen and key alone", () => {
  const k = { tonicPc: 2, family: 0, mode: 1 };
  const keyed: Subject[] = [
    { kind: "plugin", plugin: "scale", key: EMPTY_KEY },
    { kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: 0 },
    { kind: "band", key: EMPTY_KEY },
    { kind: "section", section: "sus", key: EMPTY_KEY },
  ];
  for (const s of keyed) assert.deepEqual(keyOf(withKey(s, k)), k);
  const fixed: Subject[] = [{ kind: "chord", symbol: "E6" }, { kind: "camera" }, { kind: "screen" }, { kind: "key" }];
  for (const s of fixed) assert.equal(withKey(s, k), s);
});

test("subject titles", () => {
  assert.equal(subjectTitle({ kind: "chord", symbol: "E6" }), "E6 chord");
  assert.equal(subjectTitle({ kind: "plugin", plugin: "scale", key: { tonicPc: 9, family: 0, mode: 1 } }), "A Dorian · Scale");
  assert.equal(subjectTitle({ kind: "position", key: E_MINOR, positionKind: "pentatonic", index: 0 }), "E Aeolian · pentatonic box 1");
  assert.equal(subjectTitle({ kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } }), "Drone · E");
  assert.equal(subjectTitle({ kind: "key" }), "Key");
});

test("sanitiseSubject drops unknown plugins and bad shapes", () => {
  assert.equal(sanitiseSubject({ kind: "plugin", plugin: "gone", key: EMPTY_KEY }, ids), null);
  assert.equal(sanitiseSubject({ kind: "chord" }, ids), null);
  assert.equal(sanitiseSubject("junk", ids), null);
  assert.equal(sanitiseSubject({ kind: "section", section: "nope", key: EMPTY_KEY }, ids), null);
  assert.equal(sanitiseSubject({ kind: "position", key: EMPTY_KEY, positionKind: "pentatonic", index: -1 }, ids), null);
  assert.deepEqual(sanitiseSubject({ kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } }, ids), { kind: "band", key: { tonicPc: 4, family: 0, mode: 0 } });
  assert.deepEqual(sanitiseSubject({ kind: "plugin", plugin: "scale", key: { tonicPc: 99 } }, ids), { kind: "plugin", plugin: "scale", key: EMPTY_KEY });
  assert.deepEqual(sanitiseSubject({ kind: "camera" }, ids), { kind: "camera" });
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
