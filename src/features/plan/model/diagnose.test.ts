import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue } from "./catalogue";
import { parsePlanConfig } from "./config";
import { exerciseTags, parseSectionDiag, parseTool, parseToolDiag, sectionInterface, sectionsOf } from "./tools";

const entries = catalogue();

/** Why a pasted tool is left out. */
const dropped = (t: unknown) => parseToolDiag(t).dropped;
/** What a pasted tool changed or defaulted. */
const notes = (t: unknown) => parseToolDiag(t).notes;

describe("a dropped tool says why", () => {
  it("unknown, missing or non-object", () => {
    assert.equal(dropped({ type: "fretboard" }), 'a tool of unknown type "fretboard"');
    assert.equal(dropped({}), "a tool with no type");
    assert.equal(dropped("x"), "a tool that isn't an object");
  });
  it("scale-neck and position-neck: scale, then key", () => {
    for (const type of ["scale-neck", "position-neck", "staff"]) {
      assert.equal(dropped({ type, scale: "minor-blues-x", key: "a" }), `a ${type} (unknown scale "minor-blues-x")`);
      assert.equal(dropped({ type, key: "a" }), `a ${type} (no scale)`);
      assert.equal(dropped({ type, scale: "dorian" }), `a ${type} (no key)`);
      assert.equal(dropped({ type, scale: "dorian", key: "zz" }), `a ${type} (unreadable key "zz")`);
    }
  });
  it("chord tools", () => {
    assert.equal(dropped({ type: "chord-shapes", chords: ["Qx"] }), "a chord-shapes (no chord it could read)");
    assert.equal(dropped({ type: "strum-along", chords: [], bpm: 80 }), "a strum-along (no chord it could read)");
    assert.equal(dropped({ type: "arpeggio-neck", chord: "Qx" }), 'an arpeggio-neck (unreadable chord "Qx")');
    assert.equal(dropped({ type: "arpeggio-neck" }), "an arpeggio-neck (no chord)");
  });
  it("singers: key, then the tune or run", () => {
    assert.equal(dropped({ type: "melody-singer", tune: 0 }), "a melody-singer (no key)");
    assert.equal(dropped({ type: "melody-singer", key: "c" }), "a melody-singer (no tune number or pick)");
    assert.equal(dropped({ type: "melody-singer", key: "c", tune: 9999 }), "a melody-singer (unknown tune 9999)");
    assert.equal(dropped({ type: "run-singer" }), "a run-singer (no run number or pick)");
  });
  it("guitar-play-along: no shape, a shape that does not expand", () => {
    assert.equal(dropped({ type: "guitar-play-along", bpm: 80 }), "a guitar-play-along (no shape)");
    assert.match(dropped({ type: "guitar-play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: [], bars: 2 } })!, /^a guitar-play-along \(its shape "progression" does not expand/);
  });
  it("backing-track: no key, no chords", () => {
    assert.equal(dropped({ type: "backing-track", progression: "nope" }), 'a backing-track (no key, and no chord to read it from)');
    assert.equal(dropped({ type: "backing-track", progression: "nope", key: "a" }), 'a backing-track (unknown progression "nope" and no chord it could read)');
    assert.equal(dropped({ type: "backing-track", key: "a" }), "a backing-track (no known progression and no chord it could read)");
  });
  it("technique tools: fingers, strokes, string, fret", () => {
    assert.match(dropped({ type: "finger-pattern", fingers: "1" })!, /^a finger-pattern \(fingers "1" must be 2-4 different fingers/);
    assert.match(dropped({ type: "finger-pattern", fingers: "1123" })!, /must be 2-4 different/);
    assert.match(dropped({ type: "picking-drill", strokes: "dxu" })!, /^a picking-drill \(strokes "dxu" must be 1-8 letters/);
    assert.match(dropped({ type: "picking-drill" })!, /strokes missing/);
    assert.match(dropped({ type: "legato-trill", fingers: "123", string: 2, fret: 5 })!, /must be 2 different fingers/);
    assert.equal(dropped({ type: "legato-trill", fingers: "12", string: 9, fret: 5 }), 'a legato-trill (unreadable string 9 (1-6))');
    assert.equal(dropped({ type: "legato-trill", fingers: "12", string: 2 }), "a legato-trill (no fret (1-12))");
  });
  it("every tool that parses has no dropped reason, and parseTool agrees with the diagnosis", () => {
    for (const t of [{ type: "chord-shapes", chords: ["Em"] }, { type: "scale-neck", scale: "dorian", key: "a" }, { type: "fretboard" }, { type: "legato-trill", fingers: "12" }]) {
      const p = parseToolDiag(t);
      assert.deepEqual(parseTool(t), p.tool);
      assert.equal(p.tool === null, p.dropped !== undefined);
    }
  });
});

describe("a defaulted value is noted", () => {
  it("backing-band: key and bpm are required", () => {
    assert.deepEqual(notes({ type: "backing-band" }), ["backing-band had no bpm; used 80.", "backing-band had no key; used A."]);
    assert.deepEqual(notes({ type: "backing-band", bpm: 999, key: "zz" }), ['backing-band had bpm 999 (not a whole number 30-240); used 80.', 'backing-band had key "zz" (not a key); used A.']);
    assert.deepEqual(notes({ type: "backing-band", bpm: 90, key: "d" }), []);
  });
  it("staff: a missing voice is tenor, noted; the click's bpm only when wrong", () => {
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a" }), ["staff had no voice; used tenor."]);
    assert.equal(parseTool({ type: "staff", scale: "dorian", key: "a" }) && (parseTool({ type: "staff", scale: "dorian", key: "a" }) as { voice: string }).voice, "tenor");
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a", voice: "alto", click: true }), []);
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a", voice: "diva" }), ['staff had voice "diva" (not a voice); used tenor.']);
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a", voice: "alto", click: true, bpm: 5 }), ["staff had bpm 5 (not a whole number 30-240); used 60."]);
  });
  it("strum-along and guitar-play-along: bpm is required", () => {
    assert.deepEqual(notes({ type: "strum-along", chords: ["Em"] }), ["strum-along had no bpm; used 80."]);
    assert.deepEqual(notes({ type: "strum-along", chords: ["Em"], bpm: 80 }), []);
    const shape = { shape: "progression", key: "a", chords: ["Am", "F"], bars: 2 };
    assert.deepEqual(notes({ type: "guitar-play-along", shape }), ["guitar-play-along had no bpm; used 80."]);
    assert.deepEqual(notes({ type: "guitar-play-along", shape: { ...shape, bpm: 70 } }), []);
  });
  it("interval-singer: a missing key is the documented default, a wrong one is noted", () => {
    assert.deepEqual(notes({ type: "interval-singer" }), []);
    assert.deepEqual(notes({ type: "interval-singer", key: "random" }), []);
    assert.deepEqual(notes({ type: "interval-singer", key: "zz" }), ['interval-singer had key "zz" (not a key); used C.']);
  });
  it("technique tools: bpm is required, fret and notes per string are optional", () => {
    assert.deepEqual(notes({ type: "finger-pattern", fingers: "1234" }), ["finger-pattern had no bpm; used 80."]);
    assert.deepEqual(notes({ type: "finger-pattern", fingers: "1234", bpm: 60, fret: 40 }), ["finger-pattern had fret 40 (not a whole number 1-12); used 1."]);
    assert.deepEqual(notes({ type: "picking-drill", strokes: "dudu", bpm: 500 }), ["picking-drill had bpm 500 (not a whole number 40-200); used 80."]);
    assert.deepEqual(notes({ type: "legato-trill", fingers: "12", string: 2, fret: 5, bpm: 60 }), []);
  });
  it("a clamped backing-track bpm is noted", () => {
    assert.deepEqual(notes({ type: "backing-track", progression: "nope", chords: ["Am", "G"], bpm: 400 }), ["backing-track had bpm 400 (40-220); used 220."]);
  });
  it("chord lists and add notes that were cut or unreadable", () => {
    assert.deepEqual(notes({ type: "chord-shapes", chords: ["Em", "Qx"] }), ['chord-shapes had chords it couldn\'t read, left out: "Qx".']);
    assert.deepEqual(notes({ type: "chord-shapes", chords: Array(9).fill("Em") }), ["chord-shapes had more than 8 chords; kept the first 8."]);
    assert.deepEqual(notes({ type: "scale-neck", scale: "dorian", key: "a", add: ["c", "d", "e", "f", "g"] }), ["scale-neck had 5 add notes; kept the first 4."]);
    assert.deepEqual(notes({ type: "position-neck", scale: "dorian", key: "a", add: ["c", "d", "e", "f", "g", "a"] }), ["position-neck had 6 add notes; kept the first 4."]);
  });
  it("a stored tool is parsed as before and parseTool says nothing", () => {
    assert.deepEqual(parseTool({ type: "staff", scale: "dorian", key: 9, voice: "baritone", click: true, bpm: 60 }, { stored: true }), { type: "staff", scale: "dorian", key: 9, voice: "baritone", click: true, bpm: 60 });
  });
});

describe("truncation", () => {
  it("the limits are in the section schemas the prompt prints", () => {
    const text = sectionInterface().join("\n");
    assert.match(text, /"maxLength":700/);
    assert.match(text, /"maxLength":100/);
    assert.match(text, /"maxLength":240/);
  });
  it("parseSectionDiag notes each cut", () => {
    assert.deepEqual(parseSectionDiag({ type: "text", text: "x".repeat(701) }).notes, ["a text was cut at 700 characters."]);
    assert.deepEqual(parseSectionDiag({ type: "heading", text: "x".repeat(101) }).notes, ["a heading was cut at 100 characters."]);
    assert.deepEqual(parseSectionDiag({ type: "list", items: ["x".repeat(241), "b"] }).notes, ["a list item was cut at 240 characters."]);
    assert.deepEqual(parseSectionDiag({ type: "list", items: Array.from({ length: 9 }, (_, i) => `s${i}`) }).notes, ["a list was cut at 8 items."]);
    assert.deepEqual(parseSectionDiag({ type: "text", text: "x".repeat(700) }).notes, []);
  });
  it("parsePlanConfig names where, and a stored plan says nothing", () => {
    const ex = (sections: unknown[]) => ({ title: "T", minutes: 5, sections });
    const week = JSON.stringify({ title: "W", progress: "p", days: Array.from({ length: 7 }, (_, i) => ({ theme: "d", exercises: [ex(i === 1 ? [{ type: "text", text: "x".repeat(800) }] : [{ type: "text", text: "ok" }]), ex([{ type: "text", text: "ok" }])] })) });
    const r = parsePlanConfig(week, entries);
    assert.ok(r.ok);
    assert.ok(r.warnings.includes("Day 2, exercise 1: a text was cut at 700 characters."), r.warnings.join("\n"));
    const stored = sectionsOf({ sections: [{ type: "text", text: "x".repeat(800) }, { type: "tool", tool: { type: "staff", scale: "dorian", key: 9, voice: "tenor" } }] });
    assert.equal(stored.length, 2);
  });
});

describe("tags", () => {
  it("keeps 3 of the AI's tags, then adds the implied multi-octave", () => {
    const wide = [{ type: "tool", tool: { type: "interval-ears", query: "", wide: true } } as const];
    assert.deepEqual(exerciseTags(["ear", "sing", "rhythm", "technique"], []), ["ear", "sing", "rhythm"]);
    assert.deepEqual(exerciseTags(["ear", "sing", "rhythm", "technique"], [...wide]), ["ear", "sing", "rhythm", "multi-octave"]);
    assert.deepEqual(exerciseTags(["multi-octave", "ear"], [...wide]), ["multi-octave", "ear"]);
  });
});

describe("rules the prompt states", () => {
  const ex = (extra: object = {}) => ({ title: "T", minutes: 5, level: "beginner", area: "guitar", tags: ["theory"], topic: "guitar-caged", sections: [{ type: "text", text: "ok" }], learnBefore: ["/theory/chords"], ...extra });
  const week = (day: (i: number) => unknown[]) => parsePlanConfig(JSON.stringify({ title: "W", progress: "p", days: Array.from({ length: 7 }, (_, i) => ({ theme: "d", exercises: day(i) })) }), entries);
  it("a good week has none of them", () => {
    const r = week(() => [ex(), ex()]);
    assert.ok(r.ok);
    assert.deepEqual(r.warnings.filter((w) => /exercises?;|tools;|learnBefore/.test(w)), []);
  });
  it("a day of 1 or 6 exercises, an exercise with no link left, more than 6 tools", () => {
    const tools = Array.from({ length: 7 }, () => ({ type: "tool", tool: { type: "note-finder" } }));
    const r = week((i) => (i === 0 ? [ex()] : i === 1 ? Array.from({ length: 6 }, () => ex()) : [ex({ sections: tools }), ex({ learnBefore: ["/nope"] })]));
    assert.ok(r.ok);
    assert.ok(r.warnings.includes("Day 1: 1 exercise; use 2 to 5."), r.warnings.join("\n"));
    assert.ok(r.warnings.includes("Day 2: 6 exercises; use 2 to 5."));
    assert.ok(r.warnings.includes("Day 3, exercise 1: 7 tools; keep it to 6."));
    assert.ok(r.warnings.includes("Day 3, exercise 2: no learnBefore link; add an attunr page to learn first."));
    assert.ok(!r.warnings.includes("Day 3, exercise 1: no learnBefore link; add an attunr page to learn first."));
  });
});

describe("list entries it could not read are noted", () => {
  const neck = { type: "scale-neck", scale: "dorian", key: "a" };
  it("names the prop and the entries; duplicates are no loss", () => {
    assert.deepEqual(notes({ ...neck, boxes: [1, 9, "x", 1], positions: [0] }), ['scale-neck "boxes" had entries it could not read (9, "x"); left them out.']);
    assert.deepEqual(notes({ ...neck, highlight: ["3", "x", "b3", "3"] }), ['scale-neck "highlight" had entries it could not read ("x"); left them out.']);
    assert.deepEqual(notes({ ...neck, mute: ["c-sharp", "nope"], add: ["c", "zz"] }), ['scale-neck "add" had entries it could not read ("zz"); left them out.', 'scale-neck "mute" had entries it could not read ("nope"); left them out.']);
    assert.deepEqual(notes({ type: "position-neck", scale: "dorian", key: "a", positions: [6] }), ['position-neck "positions" had entries it could not read (6); left them out.']);
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a", voice: "alto", notes: ["1", "c-sharp"] }), ['staff "notes" had entries it could not read ("c-sharp"); left them out.']);
    assert.deepEqual(notes({ type: "guitar-play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: ["Am", "F"], bars: 2 }, enable: ["1", "q"] }), ['guitar-play-along "enable" had entries it could not read ("q"); left them out.']);
    assert.deepEqual(notes({ type: "finger-pattern", fingers: "12", bpm: 60, strings: [1, 7] }), ['finger-pattern "strings" had entries it could not read (7); left them out.']);
    assert.deepEqual(notes({ type: "interval-singer", key: "c", keys: ["d", "zz"], intervals: [4, 13] }), ['interval-singer "intervals" had entries it could not read (13); left them out.', 'interval-singer "keys" had entries it could not read ("zz"); left them out.']);
    assert.deepEqual(notes({ type: "backing-track", progression: "nope", chords: ["Am", "G"], mute: ["drums", "tuba"] }), ['backing-track "mute" had entries it could not read ("tuba"); left them out.']);
    assert.deepEqual(notes({ type: "backing-band", bpm: 80, key: "a", parts: { click: "on", tuba: "on", bass: "loud" } }), ['backing-band "parts" had entries it could not read ({"tuba":"on"}, {"bass":"loud"}); left them out.']);
    assert.deepEqual(notes({ type: "backing-band", bpm: 80, key: "a", parts: ["click", "tuba"] }), ['backing-band "parts" had entries it could not read ("tuba"); left them out.']);
  });
  it("numbers in degree lists from a paste are reported, with how to write them", () => {
    assert.deepEqual(notes({ ...neck, enable: [3, "5", 7] }), ['scale-neck "enable" had numbers (3, 7); write degrees as strings ("3", "b7"); left them out.']);
    assert.deepEqual(notes({ type: "staff", scale: "dorian", key: "a", voice: "alto", notes: [0, 4] }), ['staff "notes" had numbers (0, 4); write degrees as strings ("3", "b7"); left them out.']);
  });
  it("an old key-choice says what it lost in the new tool's words", () => {
    assert.match(notes({ type: "key-choice", keys: ["c", "d", "zz"] }).join("\n"), /^step-choice left out options it could not use \(\{"key":"zz"\}\)/);
    assert.equal(dropped({ type: "key-choice", keys: ["c"] }), "a step-choice (it needs 2 to 4 different options)");
  });
  it("a step-choice: options, parts and label", () => {
    const sc = (options: unknown[], extra: Record<string, unknown> = {}) => ({ type: "step-choice", options, ...extra });
    assert.deepEqual(parseToolDiag(sc([{ key: "g" }, { key: "a" }])), { tool: { type: "step-choice", options: [{ key: 7 }, { key: 9 }] }, notes: [] });
    assert.deepEqual(parseToolDiag(sc([{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }], { label: "stage" })), { tool: { type: "step-choice", label: "stage", options: [{ bpm: 60 }, { bpm: 80 }, { bpm: 100 }] }, notes: [] });
    // at most four
    const five = parseToolDiag(sc([60, 70, 80, 90, 100].map((bpm) => ({ bpm }))));
    assert.equal(five.tool?.type === "step-choice" && five.tool.options.length, 4);
    assert.match(five.notes.join("\n"), /at most 4 options/);
    // the same parts in every option; too few left is no chooser
    const uneven = parseToolDiag(sc([{ key: "g", bpm: 60 }, { key: "a" }, { key: "c", bpm: 80 }]));
    assert.deepEqual(uneven.tool, { type: "step-choice", label: "variant", options: [{ key: 7, bpm: 60 }, { key: 0, bpm: 80 }] });
    assert.match(uneven.notes.join("\n"), /every option needs the same parts/);
    assert.equal(dropped(sc([{ key: "g", bpm: 60 }, { key: "a" }])), "a step-choice (it needs 2 to 4 different options)");
    assert.equal(dropped(sc([{ key: "g" }, { key: "g" }])), "a step-choice (it needs 2 to 4 different options)");
    assert.equal(dropped(sc([{}, {}])), "a step-choice (it needs 2 to 4 different options)");
    // the label
    const odd = parseToolDiag(sc([{ key: "g" }, { key: "a" }], { label: "level" }));
    assert.deepEqual(odd.tool, { type: "step-choice", options: [{ key: 7 }, { key: 9 }] });
    assert.match(odd.notes.join("\n"), /label/);
    const bare = parseToolDiag(sc([{ key: "g", position: 1 }, { key: "c", position: 4 }]));
    assert.equal(bare.tool?.type === "step-choice" && bare.tool.label, "variant");
    assert.match(bare.notes.join("\n"), /variant/);
    // values out of range
    const fast = parseToolDiag(sc([{ bpm: 60 }, { bpm: 500 }]));
    assert.deepEqual(fast.tool, { type: "step-choice", options: [{ bpm: 60 }, { bpm: 240 }] });
    assert.equal(fast.notes.length, 1);
    const far = parseToolDiag(sc([{ position: 1 }, { position: 9 }, { position: 2 }]));
    assert.deepEqual(far.tool, { type: "step-choice", options: [{ position: 1 }, { position: 2 }] });
    assert.equal(far.notes.length, 1);
    // a stored plan is read as it is, without notes
    assert.deepEqual(parseToolDiag({ type: "step-choice", options: [{ key: 7, position: 1 }, { key: 0, position: 4 }] }, { stored: true }), { tool: { type: "step-choice", label: "variant", options: [{ key: 7, position: 1 }, { key: 0, position: 4 }] }, notes: [] });
  });
  it("a scale-neck's parts", () => {
    const neck = (parts: unknown) => ({ type: "scale-neck", scale: "minor-pentatonic", key: "a", parts });
    assert.deepEqual(parseToolDiag(neck({ positions: "always", neck: "off" })).tool, { type: "scale-neck", scale: "minor-pentatonic", key: 9, parts: { positions: "always", neck: "off" } });
    assert.deepEqual(parseToolDiag({ ...neck(["neck"]), neck: true }).tool, { type: "scale-neck", scale: "minor-pentatonic", key: 9, parts: { neck: "always" } });
    assert.deepEqual(notes(neck({ neck: "on", tab: "on", positions: "loud" })), ['scale-neck "parts" had entries it could not read ({"tab":"on"}, {"positions":"loud"}); left them out.']);
    assert.deepEqual(notes(neck({ positions: "off", neck: "off" })), ['scale-neck "parts" had every part "off"; positions set to "on".']);
  });
  it("a stored tool says nothing, and keeps its semitone numbers", () => {
    const stored = { type: "scale-neck", scale: "dorian", key: 9, boxes: [1, 9], enable: [0, 3, 12], add: ["zz"] };
    assert.deepEqual(parseToolDiag(stored, { stored: true }).notes, []);
    assert.deepEqual((parseTool(stored, { stored: true }) as { enable: number[] }).enable, [0, 3]);
    assert.deepEqual(sectionsOf({ sections: [{ type: "tool", tool: stored as never }] }).length, 1);
  });
});
