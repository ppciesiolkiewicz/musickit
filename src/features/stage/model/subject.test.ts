import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY, type KeyChoice } from "@/features/creator/model/key";
import { TOOLS, type PlanTool } from "@/features/plan/model/tools";
import { defaultRect } from "./layers";
import { FAMILIES } from "./families";
import { paletteCatalog } from "./search";
import { followMaster, parseText, pinAgainst, sanitiseSubject, subjectIdentity, subjectTitle, takesMic, withMaster, withOwnKey, type Subject } from "./subject";
import { STAGE_TOOLS, toolKey, withToolKey } from "./toolKey";

test("a melody keeps a whole number of beats across from 2 to 16", () => {
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6 }, []), { kind: "melody", beats: 6 });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 1 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 17 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6.5 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody" }, []), { kind: "melody" });
});

test("the video widgets are subjects", () => {
  for (const kind of ["countdown", "intro", "progress", "next"]) assert.deepEqual(sanitiseSubject({ kind }, []), { kind });
});

test("names", () => {
  assert.equal(subjectTitle({ kind: "melody", beats: 6 }), "Melody");
  assert.equal(subjectTitle({ kind: "countdown" }), "Countdown");
  assert.equal(subjectTitle({ kind: "intro" }), "Intro");
  assert.equal(subjectTitle({ kind: "progress" }), "Tune progress");
  assert.equal(subjectTitle({ kind: "next" }), "Up next");
});

test("none of them is offered by the studio's palette", () => {
  const kinds = paletteCatalog(["scale", "chords"], EMPTY_KEY).flatMap((r) => (r.action.type === "add" ? [r.action.subject.kind as string] : []));
  assert.ok(kinds.length > 0);
  for (const k of ["melody", "countdown", "intro", "progress", "next"]) assert.ok(!kinds.includes(k), k);
});

/* ---------------------------------------------------------------- the tool subject */

const ids = ["scale", "chords", "circle", "keys", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];
const D: KeyChoice = { tonicPc: 2, family: 0, mode: 0 };
const pent: PlanTool = { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1, 2] };

test("a tool subject holds the parsed plan tool", () => {
  const s = sanitiseSubject({ kind: "tool", tool: pent }, ids);
  assert.deepEqual(s, { kind: "tool", tool: TOOLS["scale-neck"].parse({ ...pent })! });
  assert.deepEqual(s, { kind: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1, 2] } });
  // only a tonic can be pinned
  assert.deepEqual(sanitiseSubject({ kind: "tool", tool: pent, pinned: ["scale", "tonic"] }, ids), { kind: "tool", tool: pent, pinned: ["tonic"] });
  assert.deepEqual(sanitiseSubject({ kind: "tool", tool: pent, pinned: ["scale"] }, ids), { kind: "tool", tool: pent });
});

test("a tool that can't be shown, or that a stage doesn't hold, is not a subject", () => {
  assert.equal(sanitiseSubject({ kind: "tool", tool: { ...pent, scale: "no-such-scale" } }, ids), null);
  assert.equal(sanitiseSubject({ kind: "tool", tool: { type: "no-such-tool", key: 9 } }, ids), null);
  assert.equal(sanitiseSubject({ kind: "tool", tool: { type: "note-finder", query: "" } }, ids), null);
  assert.equal(sanitiseSubject({ kind: "tool" }, ids), null);
  assert.equal(sanitiseSubject({ kind: "tool", tool: "scale-neck" }, ids), null);
  assert.deepEqual(STAGE_TOOLS, ["scale-neck", "position-neck", "arpeggio-neck", "chord-shapes", "staff", "melody-singer"]);
});

test("the master moves an unpinned tool's key, never a pinned one's, never its scale", () => {
  const moved = withMaster({ kind: "tool", tool: pent }, { tonicPc: 2, family: 0, mode: 5 });
  assert.deepEqual(moved, { kind: "tool", tool: { ...pent, key: 2 } });
  assert.deepEqual(withMaster({ kind: "tool", tool: pent, pinned: ["tonic"] }, D), { kind: "tool", tool: pent, pinned: ["tonic"] });
  // no master key: nothing moves
  assert.deepEqual(withMaster({ kind: "tool", tool: pent }, EMPTY_KEY), { kind: "tool", tool: pent });
  // chord shapes have no key
  const shapes: Subject = { kind: "tool", tool: { type: "chord-shapes", chords: ["Am", "C"] } };
  assert.deepEqual(withMaster(shapes, D), shapes);
});

test("a key set on the tool pins its tonic; following the master drops the pin", () => {
  const own = withOwnKey({ kind: "tool", tool: pent }, { tonicPc: 4, family: 0, mode: 0 });
  assert.deepEqual(own, { kind: "tool", tool: { ...pent, key: 4 }, pinned: ["tonic"] });
  assert.deepEqual(followMaster(own, D), { kind: "tool", tool: { ...pent, key: 2 } });
  assert.deepEqual(pinAgainst({ kind: "tool", tool: pent }, D), { kind: "tool", tool: pent, pinned: ["tonic"] });
  assert.deepEqual(pinAgainst({ kind: "tool", tool: pent }, { tonicPc: 9, family: 0, mode: 0 }), { kind: "tool", tool: pent });
});

test("a family widget made on a stage with no root is not pinned, so setting the master moves it", () => {
  const G: KeyChoice = { tonicPc: 7, family: 0, mode: 0 };
  const made = FAMILIES.find((f) => f.id === "scale")!.make({}, EMPTY_KEY);
  const added = pinAgainst(made, EMPTY_KEY, EMPTY_KEY);
  assert.equal(added.kind === "tool" && added.pinned, undefined);
  const moved = withMaster(added, G);
  assert.equal(moved.kind === "tool" && toolKey(moved.tool), 7);
});

test("a family widget is pinned when it was made in a key the master doesn't have, or its own key differs from that", () => {
  const E_MIN: KeyChoice = { tonicPc: 4, family: 0, mode: 5 };
  const C: KeyChoice = { tonicPc: 0, family: 0, mode: 0 };
  // a typed "e minor pent" with no master root
  const ePent = FAMILIES.find((f) => f.id === "scale")!.make({}, E_MIN);
  assert.deepEqual(pinAgainst(ePent, EMPTY_KEY, E_MIN), { ...ePent, pinned: ["tonic"] });
  // a typed key that differs from the master
  assert.deepEqual(pinAgainst(ePent, D, E_MIN), { ...ePent, pinned: ["tonic"] });
  // made in the master's key: not pinned
  assert.deepEqual(pinAgainst(ePent, { ...E_MIN, mode: 0 }, E_MIN), ePent);
  // an arpeggio given G7 while in C
  const g7: Subject = { kind: "tool", tool: { type: "arpeggio-neck", chord: "G7" } };
  assert.deepEqual(pinAgainst(g7, C, C), { ...g7, pinned: ["tonic"] });
  // an arpeggio given G7 on a stage with no root
  assert.deepEqual(pinAgainst(g7, EMPTY_KEY, EMPTY_KEY), { ...g7, pinned: ["tonic"] });
});

test("a tool's identity ignores its key", () => {
  assert.equal(subjectIdentity({ kind: "tool", tool: pent }), subjectIdentity({ kind: "tool", tool: { ...pent, key: 2 }, pinned: ["tonic"] }));
  assert.notEqual(subjectIdentity({ kind: "tool", tool: pent }), subjectIdentity({ kind: "tool", tool: { ...pent, boxes: [1] } }));
  const arp = (chord: string): Subject => ({ kind: "tool", tool: { type: "arpeggio-neck", chord } });
  assert.equal(subjectIdentity(arp("Am7")), subjectIdentity(arp("Dm7")));
  assert.notEqual(subjectIdentity(arp("Am7")), subjectIdentity(arp("A7")));
});

test("a staff with the mic (on by default) takes the audio input", () => {
  const staff = (mic?: boolean): Subject => ({ kind: "tool", tool: { type: "staff", scale: "major", key: 0, voice: "baritone", ...(mic === undefined ? {} : { mic }) } });
  assert.equal(takesMic(staff(true)), true);
  assert.equal(takesMic(staff(false)), false);
  assert.equal(takesMic(staff()), true);
});

test("tool necks and chord boxes ring the heard note; the position neck does not", () => {
  assert.equal(takesMic({ kind: "tool", tool: pent }), true);
  assert.equal(takesMic({ kind: "tool", tool: { type: "arpeggio-neck", chord: "Am7" } }), true);
  assert.equal(takesMic({ kind: "tool", tool: { type: "chord-shapes", chords: ["Am"] } }), true);
  assert.equal(takesMic({ kind: "tool", tool: { type: "position-neck", scale: "dorian", key: 2 } }), false);
});

test("a tool is named by its family; one no family offers by its type and key", () => {
  assert.equal(subjectTitle({ kind: "tool", tool: pent }), "Scale · A minor pentatonic · positions 1–2");
  assert.equal(subjectTitle({ kind: "tool", tool: { type: "chord-shapes", chords: ["Am"] } }), "Chord shapes · Am");
  assert.equal(subjectTitle({ kind: "tool", tool: { type: "position-neck", scale: "dorian", key: 2 } }), "position-neck · D");
});

test("a tool's key: its own key, an arpeggio's chord root, none for chord shapes", () => {
  assert.equal(toolKey(pent), 9);
  assert.equal(toolKey({ type: "arpeggio-neck", chord: "Am7" }), 9);
  assert.equal(toolKey({ type: "chord-shapes", chords: ["Am"] }), null);
  assert.deepEqual(withToolKey({ type: "arpeggio-neck", chord: "Am7", boxes: [1] }, 2), { type: "arpeggio-neck", chord: "Dm7", boxes: [1] });
  assert.deepEqual(withToolKey({ ...pent, add: [3] }, 2), { ...pent, key: 2, add: [8] });
  assert.deepEqual(withToolKey({ type: "chord-shapes", chords: ["Am"] }, 2), { type: "chord-shapes", chords: ["Am"] });
});

test("a tool's default place: wide necks 0.6 × 0.5 of the frame, the rest 0.4 × 0.4", () => {
  const size = (s: Subject) => { const r = defaultRect(s, []); return [r.w, r.h]; };
  assert.deepEqual(size({ kind: "tool", tool: pent }), [0.6, 0.5]);
  assert.deepEqual(size({ kind: "tool", tool: { type: "position-neck", scale: "major", key: 0 } }), [0.6, 0.5]);
  assert.deepEqual(size({ kind: "tool", tool: { type: "chord-shapes", chords: ["Am"] } }), [0.4, 0.4]);
});

test("every older subject kind loads as it was saved", () => {
  const key: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
  const old: Subject[] = [
    { kind: "chord", symbol: "Am7" },
    { kind: "plugin", plugin: "scale", key },
    { kind: "plugin", plugin: "modes", full: true, key, pinned: ["scale"] },
    { kind: "position", positionKind: "pentatonic", index: 1, key },
    { kind: "position", positionKind: "3nps", index: 6, key, pinned: ["tonic", "scale"] },
    { kind: "band", key },
    { kind: "section", section: "relatives", key },
    { kind: "bubble", degree: 3, key },
    { kind: "neck", key: EMPTY_KEY },
    { kind: "caged", shape: "E", key },
    { kind: "caged", shape: null, key, pinned: ["tonic"] },
    { kind: "key" }, { kind: "tuner" }, { kind: "mic" }, { kind: "logo" }, { kind: "url" }, { kind: "camera" }, { kind: "screen" },
    { kind: "melody", beats: 8 }, { kind: "melody" }, { kind: "countdown" }, { kind: "intro" }, { kind: "progress" }, { kind: "next" },
  ];
  for (const s of old) assert.deepEqual(sanitiseSubject(JSON.parse(JSON.stringify(s)), ids), s, s.kind);
});

test("CAGED shapes: several letters in CAGED order, deduped, unknown dropped, empty falls back to shape", () => {
  const key: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
  const clean = (o: object) => sanitiseSubject({ kind: "caged", key, ...o }, ids);
  assert.deepEqual(clean({ shape: null, shapes: ["E", "A"] }), { kind: "caged", shape: null, shapes: ["A", "E"], key });
  assert.deepEqual(clean({ shape: null, shapes: ["E", "x", "E", "C"] }), { kind: "caged", shape: null, shapes: ["C", "E"], key });
  assert.deepEqual(clean({ shape: "G", shapes: [] }), { kind: "caged", shape: "G", key });
  assert.deepEqual(clean({ shape: "G", shapes: ["z"] }), { kind: "caged", shape: "G", key });
  assert.deepEqual(clean({ shape: "E" }), { kind: "caged", shape: "E", key });
});

test("CAGED shapes: the name lists the letters, the identity ignores the key and keeps the shapes", () => {
  const key: KeyChoice = { tonicPc: 9, family: 0, mode: 5 };
  const two: Subject = { kind: "caged", shape: null, shapes: ["A", "E"], key };
  assert.match(subjectTitle(two), /A, E/);
  const one: Subject = { kind: "caged", shape: "E", key };
  assert.doesNotMatch(subjectTitle(one), /A, E/);
  assert.equal(subjectIdentity(two), subjectIdentity({ ...two, key: EMPTY_KEY }));
  assert.notEqual(subjectIdentity(two), subjectIdentity({ ...two, shapes: ["A", "D"] }));
  assert.notEqual(subjectIdentity(two), subjectIdentity({ kind: "caged", shape: null, key }));
});

test("an arpeggio widget follows the master, pins, saves and takes the audio input", () => {
  const arp: Subject = { kind: "arpeggio", key: { tonicPc: 0, family: 0, mode: 0 }, degree: 4, type: "seventh", neck: true, roots: [6, 5] };
  const dorian = { tonicPc: 2, family: 0, mode: 1 };
  assert.deepEqual(withMaster(arp, dorian), { ...arp, key: dorian });
  assert.deepEqual(withMaster({ ...arp, pinned: ["scale"] }, dorian), { ...arp, pinned: ["scale"], key: { tonicPc: 2, family: 0, mode: 0 } });
  assert.deepEqual(sanitiseSubject(arp, ids), arp);
  assert.equal(takesMic(arp), true);
  // what can't be drawn is dropped
  assert.equal(sanitiseSubject({ ...arp, degree: 7 }, ids), null);
  assert.equal(sanitiseSubject({ ...arp, type: "nope" }, ids), null);
  // only real root strings stay; none left is all of them
  assert.deepEqual(sanitiseSubject({ ...arp, roots: [1, 5, "x"] }, ids), { ...arp, roots: [5] });
  assert.equal("roots" in sanitiseSubject({ ...arp, roots: [1] }, ids)!, false);
  // hiding the positions needs the neck to show
  assert.equal("positions" in sanitiseSubject({ kind: "arpeggio", key: arp.key, degree: 0, type: "triad", positions: false }, ids)!, false);
});

test("a text widget keeps its words, cut at the limit, and has a title", () => {
  assert.deepEqual(sanitiseSubject({ kind: "text", text: "Hello" }, []), { kind: "text", text: "Hello" });
  assert.equal(sanitiseSubject({ kind: "text" }, []), null);
  assert.equal((sanitiseSubject({ kind: "text", text: "x".repeat(9000) }, []) as { text: string }).text.length, 4000);
  assert.equal(subjectTitle({ kind: "text", text: "# The major scale\n\nWords" }), "Text · The major scale");
  assert.equal(subjectTitle({ kind: "text", text: "" }), "Text");
});

test("text splits into headings and paragraphs", () => {
  assert.deepEqual(parseText("# One\n\nFirst line\nsecond line\n\n## Two\nBody"), [
    { type: "h1", text: "One" },
    { type: "p", text: "First line\nsecond line" },
    { type: "h2", text: "Two" },
    { type: "p", text: "Body" },
  ]);
  assert.deepEqual(parseText("  \n\n"), []);
});

test("the palette offers a text widget once, in its own section", () => {
  const rows = paletteCatalog([], EMPTY_KEY, { camera: "off", screen: "off" } as never).filter((r) => r.action.type === "add" && r.action.subject.kind === "text");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].group, "text");
});
