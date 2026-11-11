import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue, checkLink } from "./catalogue";
import { parsePlanConfig } from "./config";
import { GLOSSARY } from "@/features/course/glossary";
import { EXERCISE_EXAMPLES } from "../examples";
import { buildPrompt, weekReport } from "./prompt";
import { runChoices } from "@/features/exercises/basics/choices";
import { COMPONENT_DOCS } from "@/features/exercises/docs";
import { expandShape } from "@/features/exercises/shapes";
import { BOOK, STAGES } from "@/features/theory/singingMelodies";
import { pickTune } from "@/features/theory/melodyPick";
import { PROGRESSIONS, STYLES } from "@/features/backing/model";
import { cellInterface, cellsOf, degreeSemis, linkResources, parseCellDiag, parseTool, parseToolDiag, toolInterface, toolsOf, type Cell } from "./tools";
import { linkLabel } from "./catalogue";
import { DEFAULT_ANSWERS } from "../intake/answers";
import { dayIndex, dayProgress, localDate, weekOver } from "./schedule";
import type { StoredPlan } from "./types";

const entries = catalogue();
const day = (n: number, link?: string) => ({ theme: `T${n}`, exercises: [{ title: `Ex ${n}`, minutes: 10, cells: [{ type: "text", text: "do it" }], ...(link ? { exploreMore: [link] } : {}) }] });
/** Warnings without the one-block and missing-tag nags, which the fixtures all trigger. */
const real = (w: string[]) => w.filter((x) => !x.includes("one block") && !/: no [a-z, ]+ tag\.$/.test(x) && x !== "No progress summary in the reply." && !/^Day \d: \d+ exercises?; use /.test(x) && !x.endsWith(": no learnBefore link; add an attunr page to learn first."));
const week = (links: (string | undefined)[] = []) => JSON.stringify({ title: "W", days: Array.from({ length: 7 }, (_, i) => day(i + 1, links[i])) });

describe("plan links", () => {
  it("keeps attunr pages and drops the rest", () => {
    assert.equal(checkLink("/theory/notes", entries), "/theory/notes");
    assert.equal(checkLink("/theory/notes?x=1#a", entries), "/theory/notes?x=1#a");
    assert.equal(checkLink("https://www.attunr.app/tuner", entries), "/tuner");
    assert.equal(checkLink("/theory/scales/dorian/e", entries), "/theory/scales/dorian/e");
    assert.equal(checkLink("/theory/scales/nonsense/e", entries), undefined);
    assert.equal(checkLink("/made-up", entries), undefined);
    assert.equal(checkLink("https://evil.example/theory/notes", entries), undefined);
    assert.equal(checkLink("//evil.example", entries), undefined);
  });
  it("course links say what the article covers", () => {
    const home = entries.find((x) => x.href === "/course/3/home-note")!;
    assert.match(home.desc, /^Course 3 · One note, three views: .+ \(planned\)$/);
    const tab = entries.find((x) => x.href === "/course/1/tab-and-chord-boxes")!;
    assert.ok(tab.desc.startsWith("Course 1 · Guitar basics: ") && !tab.desc.endsWith("(planned)"), tab.desc);
  });
});

describe("tools", () => {
  it("pinned keeps the parts a tool can follow and notes the rest", () => {
    const p = parseToolDiag({ type: "scale-neck", scale: "minor-pentatonic", key: "g", pinned: ["key", "bpm", "nope"] });
    assert.deepEqual(p.tool?.pinned, ["key"]);
    assert.ok(p.notes.some((n) => n.includes("cannot follow (scale-neck: bpm, nope)")), p.notes.join("|"));
    assert.equal(parseToolDiag({ type: "note-finder", query: "c", pinned: ["key"] }).tool?.pinned, undefined);
    assert.equal(parseToolDiag({ type: "scale-neck", scale: "minor-pentatonic", key: "g" }).tool?.pinned, undefined);
  });
  it("stub tools parse and drop junk", () => {
    assert.deepEqual(parseTool({ type: "finger-pattern", fingers: "1324", bpm: 60 }), { type: "finger-pattern", fingers: "1324", fret: 1, bpm: 60 });
    assert.deepEqual(parseTool({ type: "finger-pattern", fingers: 1234, fret: 5, strings: [1, 6, 6, 9], bpm: "fast" }), { type: "finger-pattern", fingers: "1234", fret: 5, strings: [6, 1], bpm: 80 });
    assert.equal(parseTool({ type: "finger-pattern", fingers: "1155", bpm: 60 }), null);
    assert.deepEqual(parseTool({ type: "finger-pattern", fingers: "1234", show: "finger", bpm: 60 }), { type: "finger-pattern", fingers: "1234", fret: 1, show: "finger", bpm: 60 });
    assert.deepEqual(parseTool({ type: "finger-pattern", fingers: "1234", show: "both", bpm: 60 }), { type: "finger-pattern", fingers: "1234", fret: 1, bpm: 60 });
    assert.equal(parseTool({ type: "finger-pattern", fingers: "1", bpm: 60 }), null);
    assert.deepEqual(parseTool({ type: "picking-drill", strokes: "du", bpm: 90, skip: true }), { type: "picking-drill", strokes: "DU", notesPerString: 4, skip: true, bpm: 90 });
    assert.equal(parseTool({ type: "picking-drill", strokes: "DX", bpm: 90 }), null);
    assert.equal(parseTool({ type: "picking-drill", strokes: "DUDUDUDUD", bpm: 90 }), null);
    assert.deepEqual(parseTool({ type: "legato-trill", fingers: "13", string: 3, fret: 5, bpm: 70 }), { type: "legato-trill", fingers: "13", string: 3, fret: 5, bpm: 70 });
    assert.equal(parseTool({ type: "legato-trill", fingers: "13", string: 9, fret: 5, bpm: 70 }), null);
    assert.equal(parseTool({ type: "legato-trill", fingers: "11", string: 3, fret: 5, bpm: 70 }), null);
  });
  it("stub tools are in the prompt's tool list", () => {
    const list = toolInterface().join("\n");
    ["finger-pattern", "picking-drill", "legato-trill"].forEach((n) => assert.ok(list.includes(n), n));
  });
  it("parses each tool, set up for the exercise", () => {
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [2, 1, 9] }), { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1, 2] });
    assert.deepEqual(parseTool({ type: "position-neck", scale: "minor-pentatonic", key: "a", cross: { from: 1, to: 2, string: 9 }, placement: { by: "open" }, picker: false }), { type: "position-neck", scale: "minor-pentatonic", key: 9, cross: { from: 1, to: 2 }, picker: false });
    assert.deepEqual(parseTool({ type: "position-neck", scale: "dorian", key: "d", positions: [3, 1], cross: { from: 2, to: 2 }, outside: "hidden" }), { type: "position-neck", scale: "dorian", key: 2, positions: [1, 3], outside: "hidden" });
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "minor-blues", key: "a", boxes: [1], add: ["c#", "C-sharp", "zz"], enable: ["1", "b3"], highlight: ["1"], others: "hidden" }), { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1], add: [1], enable: [0, 3], highlight: [0], others: "hidden" });
    assert.deepEqual(parseTool({ type: "chord-shapes", chords: ["G", "Em", "nonsense!", 3], voicing: "barre" }), { type: "chord-shapes", chords: ["G", "Em"], voicing: "barre" });
    assert.deepEqual(parseTool({ type: "staff", scale: "major-ionian", key: "c", voice: "alto" }), { type: "staff", scale: "major-ionian", key: 0, voice: "alto" });
    assert.deepEqual(parseTool({ type: "backing-band", bpm: 70, key: "e", parts: ["drone", "drone", "kazoo"] }), { type: "backing-band", bpm: 70, key: 4, parts: { drone: "on" } });
    assert.deepEqual(parseTool({ type: "backing-band", bpm: 70, key: "e", parts: { drone: "always", click: "off", bass: "loud", kazoo: "on" } }), { type: "backing-band", bpm: 70, key: 4, parts: { drone: "always", click: "off" } });
    assert.deepEqual(parseTool({ type: "backing-band", bpm: 70, key: "e", parts: {} }), { type: "backing-band", bpm: 70, key: 4, parts: { click: "on" } });
    assert.deepEqual(parseTool({ type: "note-finder", strings: "56", from: 0, to: 5 }), { type: "note-finder", query: "strings=56&from=0&to=5" });
    assert.deepEqual(parseTool({ type: "arpeggio-neck", chord: "Am", boxes: [2, 3], part: ["1", "b3", "zz"], highlight: ["1"] }), { type: "arpeggio-neck", chord: "Am", boxes: [2, 3], part: ["1", "b3"], highlight: [0] });
    assert.equal(parseTool({ type: "arpeggio-neck", chord: "nonsense!" }), null);
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "d", voice: "tenor" }), { type: "melody-singer", tune: 1, key: 2, voice: "tenor" });
    assert.equal(parseTool({ type: "melody-singer", tune: 9999, key: "d" }), null);
    const picked = parseTool({ type: "melody-singer", pick: { difficulty: "easy" }, key: "a" });
    assert.deepEqual(picked, { type: "melody-singer", tune: pickTune(BOOK, { difficulty: "easy" })!.n, key: 9 });
    assert.ok(!("pick" in picked!));
    assert.deepEqual(parseTool({ type: "run-singer", run: runChoices()[0].id, key: "c" }), { type: "run-singer", run: runChoices()[0].id });
  });
  it("keeps a singer's chords on unless turned off", () => {
    const run = runChoices()[0].id;
    assert.deepEqual(parseTool({ type: "run-singer", run, key: "c", chords: false }), { type: "run-singer", run, chords: false });
    assert.deepEqual(parseTool({ type: "run-singer", run, key: "c", chords: true }), { type: "run-singer", run });
    assert.deepEqual(parseTool({ type: "run-singer", run, key: "c", chords: "no" }), { type: "run-singer", run });
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "c", chords: false }), { type: "melody-singer", tune: 1, key: 0, chords: false });
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "c" }), { type: "melody-singer", tune: 1, key: 0 });
  });
  it("keeps a melody's metronome off and the open strings' on unless changed", () => {
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "c", metronome: true }), { type: "melody-singer", tune: 1, key: 0, metronome: true });
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "c", metronome: false }), { type: "melody-singer", tune: 1, key: 0 });
    assert.deepEqual(parseTool({ type: "string-singer", metronome: false }), { type: "string-singer", metronome: false });
    assert.deepEqual(parseTool({ type: "string-singer", metronome: true }), { type: "string-singer" });
  });
  it("parses the tuning-by-ear tools", () => {
    assert.deepEqual(parseTool({ type: "string-singer" }), { type: "string-singer" });
    assert.deepEqual(parseTool({ type: "string-singer", drill: "strings", voice: "alto" }), { type: "string-singer" });
    assert.deepEqual(parseTool({ type: "string-singer", drill: "pairs" }), { type: "string-singer", drill: "pairs" });
    assert.deepEqual(parseTool({ type: "breathwork" }), { type: "breathwork" });
    assert.deepEqual(parseTool({ type: "breathwork", drill: "farinelli", from: 3, to: 7, rounds: 2 }), { type: "breathwork", from: 3, to: 7 });
    assert.deepEqual(parseTool({ type: "breathwork", from: 6, to: 4 }), { type: "breathwork", from: 6 });
    assert.deepEqual(parseTool({ type: "breathwork", drill: "sss-zzz", seconds: 5, rounds: 2, from: 3 }), { type: "breathwork", drill: "sss-zzz", seconds: 5, rounds: 2 });
    assert.deepEqual(parseTool({ type: "breathwork", drill: "nope", seconds: 99 }), { type: "breathwork" });
    assert.deepEqual(parseTool({ type: "string-singer", drill: "nope", voice: "x" }), { type: "string-singer" });
    assert.deepEqual(parseTool({ type: "interval-singer" }), { type: "interval-singer", key: 0 });
    assert.deepEqual(parseTool({ type: "interval-singer", key: "g", intervals: [7, 7, 4, 30], dir: "both", dot: false }), { type: "interval-singer", key: 7, intervals: [4, 7], dir: "both", dot: false });
    assert.deepEqual(parseTool({ type: "interval-singer", keys: ["c", "f", "g"] }), { type: "interval-singer", key: 0, keys: [0, 5, 7] });
    assert.deepEqual(parseTool({ type: "interval-singer", key: "random" }), { type: "interval-singer", key: 0, keys: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
  });
  it("reads degrees for highlighting and showing only chosen notes", () => {
    assert.equal(degreeSemis("b7"), 10);
    assert.equal(degreeSemis("♭3"), 3);
    assert.equal(degreeSemis("#4"), 6);
    assert.equal(degreeSemis("x"), null);
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "mixolydian", key: "a", highlight: ["1", "3", "5", "b7", "zz"] }), { type: "scale-neck", scale: "mixolydian", key: 9, highlight: [0, 4, 7, 10] });
    assert.deepEqual(parseTool({ type: "staff", scale: "mixolydian", key: "a", notes: ["1", "3", "5", "♭7"] }), { type: "staff", scale: "mixolydian", key: 9, voice: "tenor", notes: [0, 4, 7, 10] });
    assert.equal((parseTool({ type: "staff", scale: "mixolydian", key: "a", notes: ["1"] }) as { notes?: number[] }).notes, undefined);
  });
  it("staff carries its own drone and click, the click's bpm defaulting to 60", () => {
    assert.deepEqual(parseTool({ type: "staff", scale: "major-ionian", key: "c", voice: "tenor", drone: true }), { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", drone: true });
    assert.deepEqual(parseTool({ type: "staff", scale: "major-ionian", key: "c", voice: "tenor", drone: true, click: true }), { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", drone: true, click: true, bpm: 60 });
    assert.deepEqual(parseTool({ type: "staff", scale: "major-ionian", key: "c", voice: "tenor", click: true, bpm: 300, drone: "yes" }), { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", click: true, bpm: 60 });
  });
  it("highlights by note name, mutes, hides; dimmed reads as muted", () => {
    const sn = (t: Record<string, unknown>) => parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", ...t }) as Record<string, unknown>;
    assert.deepEqual(sn({ add: ["c-sharp"], highlight: ["c-sharp"] }), { type: "scale-neck", scale: "minor-pentatonic", key: 9, add: [1], highlight: [4] });
    assert.deepEqual(sn({ highlight: ["b3"] }).highlight, [3]);
    const m = sn({ enable: ["1", "b3"], mute: ["5"], hide: ["b7"], others: "hidden" });
    assert.deepEqual([m.mute, m.hide, m.others], [[7], [10], "hidden"]);
    assert.deepEqual((parseTool({ type: "arpeggio-neck", chord: "A7", highlight: ["c-sharp", "g"] }) as { highlight?: number[] }).highlight, [4, 10]);
    assert.equal((parseTool({ type: "staff", scale: "major-ionian", key: "c", enable: ["3"], others: "dimmed" }) as { others?: string }).others, "muted");
    const pa = parseTool({ type: "guitar-play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2 }, enable: ["1", "3"], others: "dimmed" }) as { enable?: string[]; others?: string };
    assert.deepEqual([pa.enable, pa.others], [["1", "3"], "muted"]);
  });
  it("enable and highlight are two layers: a highlight alone keeps every note in play", () => {
    const sn = (t: Record<string, unknown>, stored = false) => parseTool({ type: "scale-neck", scale: "major-ionian", key: "c", ...t }, { stored }) as Record<string, unknown>;
    assert.deepEqual(sn({ enable: ["1", "3"], highlight: ["3"] }), { type: "scale-neck", scale: "major-ionian", key: 0, enable: [0, 4], highlight: [4] });
    assert.deepEqual(sn({ highlight: ["3"], others: "normal" }), { type: "scale-neck", scale: "major-ionian", key: 0, highlight: [4] });
    // written before `enable`: a highlight that muted or hid the rest was the set in play
    assert.deepEqual(sn({ highlight: [3], others: "dimmed" }, true), { type: "scale-neck", scale: "major-ionian", key: 0, enable: [3], others: "muted" });
    assert.deepEqual(sn({ highlight: ["1"], others: "hidden" }), { type: "scale-neck", scale: "major-ionian", key: 0, enable: [0], others: "hidden" });
    // and it reads back the same once stored
    assert.deepEqual(sn(sn({ highlight: ["1"], others: "hidden" }), true), sn({ highlight: ["1"], others: "hidden" }));
    const pa = (t: Record<string, unknown>) => parseTool({ type: "guitar-play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2 }, ...t }) as Record<string, unknown>;
    assert.deepEqual([pa({ highlight: ["1"], others: "hidden" }).enable, pa({ highlight: ["1"], others: "hidden" }).highlight], [["1"], undefined]);
    assert.deepEqual([pa({ enable: ["1", "3", "5"], highlight: ["3"] }).enable, pa({ enable: ["1", "3", "5"], highlight: ["3"] }).highlight], [["1", "3", "5"], ["3"]]);
  });
  it("others without an enable is dropped: it means nothing and would blank or fade the view", () => {
    for (const stored of [true, false]) {
      assert.equal((parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", others: "dimmed" }, { stored }) as { others?: string }).others, undefined);
      assert.equal((parseTool({ type: "arpeggio-neck", chord: "A7", others: "hidden" }, { stored }) as { others?: string }).others, undefined);
    }
    assert.equal((parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", highlight: ["b9"], others: "hidden" }) as { others?: string }).others, undefined);
  });
  it("a bare number is never a note name: 9 and 11 are not pitch classes", () => {
    const h = (highlight: unknown[]) => (parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", highlight }) as { highlight?: number[] }).highlight;
    assert.equal(h(["9", "11"]), undefined);
    assert.deepEqual((parseTool({ type: "arpeggio-neck", chord: "C7", highlight: ["9", "3"] }) as { highlight?: number[] }).highlight, [4]);
  });
  it("a strum-along keeps a pattern that fills the bar, written by beat", () => {
    assert.deepEqual(parseTool({ type: "strum-along", chords: ["G"], bpm: 70, pattern: "d . d u . u d u" }), { type: "strum-along", chords: ["G"], bpm: 70, pattern: "D . | D U | . U | D U" });
    assert.deepEqual(parseTool({ type: "strum-along", chords: ["G"], bpm: 70, beats: 3, pattern: "D D U D U" }), { type: "strum-along", chords: ["G"], bpm: 70, beats: 3 });
  });
  it("play-along bpm/repeats inside the shape are a fallback; top-level wins", () => {
    const inner = parseTool({ type: "guitar-play-along", shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4, bpm: 70, repeats: 6 } });
    assert.ok(inner && inner.type === "guitar-play-along");
    assert.equal(inner.bpm, 70);
    assert.equal(inner.repeats, 6);
    const top = parseTool({ type: "guitar-play-along", bpm: 90, repeats: 2, shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4, bpm: 70, repeats: 6 } });
    assert.ok(top && top.type === "guitar-play-along");
    assert.equal(top.bpm, 90);
    assert.equal(top.repeats, 2);
  });
  it("numeric degrees: semitones in stored plans, dropped from pasted input", () => {
    const raw = { type: "scale-neck", scale: "mixolydian", key: "a", highlight: [3, "5"] };
    assert.deepEqual((parseTool(raw) as { highlight?: number[] }).highlight, [7]);
    assert.deepEqual((parseTool(raw, { stored: true }) as { highlight?: number[] }).highlight, [3, 7]);
    const p = JSON.parse(week());
    p.days[0].exercises[0] = { title: "x", minutes: 5, cells: [{ type: "tool", tool: raw }] };
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.deepEqual((r.config.days[0].exercises[0].cells[0] as { tool: { highlight?: number[] } }).tool.highlight, [7]);
  });
  it("placement: boxes win; by chords resolves from the exercise's chords", () => {
    const both = parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [2], placement: { by: "open" } }) as Record<string, unknown>;
    assert.deepEqual([both.boxes, both.placement], [[2], undefined]);
    assert.deepEqual((parseTool({ type: "arpeggio-neck", chord: "A7", placement: { by: "root", string: 5 } }) as { placement?: unknown }).placement, { by: "root", string: 5 });
    const neck = { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", add: ["c-sharp"], placement: { by: "chords" } } };
    const placed = (sections: unknown[]) => {
      const p = JSON.parse(week());
      p.days[0].exercises[0] = { title: "x", minutes: 5, cells: sections };
      const r = parsePlanConfig(JSON.stringify(p), entries);
      assert.ok(r.ok);
      const s = r.config.days[0].exercises[0].cells.find((x) => x.type === "tool" && x.tool.type === "scale-neck") as { tool: { placement?: unknown } };
      return s.tool.placement;
    };
    assert.deepEqual(placed([{ type: "tool", tool: { type: "chord-shapes", chords: ["A7", "D7", "E7"] } }, neck]), { by: "open" });
    assert.deepEqual(placed([{ type: "tool", tool: { type: "chord-shapes", chords: ["A7"], voicing: "barre" } }, neck]), { by: "fret", fret: 5 });
    assert.deepEqual(placed([{ type: "tool", tool: { type: "guitar-play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2, voicing: "barre" } } }, neck]), { by: "fret", fret: 5 });
    assert.equal(placed([neck]), undefined);
  });
  it("a backing-track needs a known progression and a key, keeps a known style, clamps its tempo", () => {
    assert.deepEqual(parseTool({ type: "backing-track", progression: "blues", key: "a", style: "shuffle", bpm: 90 }), { type: "backing-track", progression: "blues", key: 9, style: "shuffle", bpm: 90 });
    assert.deepEqual(parseTool({ type: "backing-track", progression: "Minor-Blues", key: "e", style: "polka", bpm: 500 }), { type: "backing-track", progression: "minor-blues", key: 4, bpm: 220 });
    assert.deepEqual(parseTool({ type: "backing-track", progression: "dorian", key: "d" }), { type: "backing-track", progression: "dorian", key: 2 });
    assert.equal(parseTool({ type: "backing-track", progression: "giant-steps", key: "b" }), null);
    assert.equal(parseTool({ type: "backing-track", progression: "blues" }), null);
  });

  it("the backing-track doc names every curated progression and style", () => {
    const doc = COMPONENT_DOCS.find((d) => d.name === "backing-track");
    const prop = (n: string) => doc?.props.find((p) => p.name === n)?.description ?? "";
    for (const p of PROGRESSIONS) assert.match(prop("progression"), new RegExp(`"${p.id}"`), p.id);
    for (const st of STYLES) assert.match(prop("style"), new RegExp(`"${st.id}"`), st.id);
  });

  it("a backing-track plays the lesson's own chords as numerals in its key, with its parts", () => {
    assert.deepEqual(parseTool({ type: "backing-track", key: "c", chords: ["Dm7", "G7", "Cmaj7", "zz"], mute: ["bass", "tuba"] }), { type: "backing-track", numerals: ["ii7", "V7", "Imaj7"], key: 0, parts: { drums: "on", bass: "off", keys: "on" } });
    assert.deepEqual(parseTool({ type: "backing-track", progression: "blues", key: "a", parts: { drums: "always", bass: "on", tuba: "on", keys: "loud" } }), { type: "backing-track", progression: "blues", key: 9, parts: { drums: "always", bass: "on" } });
    assert.deepEqual(parseTool({ type: "backing-track", progression: "blues", key: "a", parts: { drums: "on", bass: "on", keys: "on" } }), { type: "backing-track", progression: "blues", key: 9 });
    assert.deepEqual(parseTool({ type: "backing-track", chords: ["Bb", "F", "Gm", "Eb"] }), { type: "backing-track", numerals: ["I", "V", "vi", "IV"], key: 10 });
    assert.deepEqual(parseTool({ type: "backing-track", key: "a", numerals: ["i", "bVII", "nope", "V7"], style: "ballad", bpm: 70 }), { type: "backing-track", numerals: ["i", "bVII", "V7"], key: 9, style: "ballad", bpm: 70 });
    assert.deepEqual(parseTool({ type: "backing-track", progression: "blues", key: "a", numerals: ["I"] }), { type: "backing-track", progression: "blues", key: 9 });
    assert.equal(parseTool({ type: "backing-track", numerals: ["I", "V"] }), null);
    assert.equal(parseTool({ type: "backing-track", key: "d", numerals: ["nope"] }), null);
  });
  it("parses a play-along by its shape", () => {
    const shape = { shape: "chord-steps", chords: [{ chord: "G", steps: ["strum", "1", "6", "1"] }, { chord: "D", steps: ["strum", "4", "5", "4"] }], voicing: "barre" };
    const t = parseTool({ type: "guitar-play-along", bpm: 70, shape });
    assert.ok(t);
    assert.deepEqual(t, { type: "guitar-play-along", bpm: 70, shape });
    assert.deepEqual(parseTool(t), t);
    assert.equal(parseTool({ type: "guitar-play-along", bpm: 70, shape: { ...shape, shape: "nonsense" } }), null);
  });
  it("ears stay inside an octave unless wide", () => {
    assert.deepEqual(parseTool({ type: "interval-ears", set: [3, 4, 7, 10], dir: "down" }), { type: "interval-ears", query: "set=3%2C4%2C7%2C10&dir=down" });
    assert.deepEqual(parseTool({ type: "interval-ears", level: 2, wide: true }), { type: "interval-ears", query: "level=2&wide=1", wide: true });
  });
  it("refuses what it can't show", () => {
    assert.equal(parseTool({ type: "scale-neck", scale: "nope", key: "a" }), null);
    assert.equal(parseTool({ type: "scale-neck", scale: "dorian", key: "zz" }), null);
    assert.equal(parseTool({ type: "chord-shapes", chords: [] }), null);
    assert.equal(parseTool({ type: "kazoo" }), null);
  });
  it("the prompt's example play-along exercise keeps its minutes after derivation", () => {
    const ex = EXERCISE_EXAMPLES.map((e) => e.exercise as { minutes: number; cells: { tool?: { type: string } }[] }).find((e) => cellsOf(e.cells as Cell[]).some((s) => s.type === "tool" && s.tool.type === "guitar-play-along"))!;
    const p = JSON.parse(week());
    p.days[0].exercises[0] = ex;
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].minutes, ex.minutes);
  });
  const one = (ex: object) => {
    const p = JSON.parse(week());
    p.days[0].exercises[0] = ex;
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    return r;
  };
  it("an exercise with a play-along repeats keeps its written minutes", () => {
    const tool = { type: "guitar-play-along", bpm: 70, repeats: 2, shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4 } };
    const r = one({ title: "t", minutes: 10, cells: [{ type: "heading", text: "A", minutes: 5 }, { type: "tool", tool }, { type: "heading", text: "B", minutes: 5 }, { type: "text", text: "x" }] });
    assert.equal(r.config.days[0].exercises[0].minutes, 10);
  });
  it("paste warns on a 12-minute exercise with one block", () => {
    const r = one({ title: "t", minutes: 12, cells: [{ type: "text", text: "x" }] });
    assert.ok(r.warnings.some((w) => w.includes("over 5 minutes in one block")));
  });
  it("warns when a melody pick matched no tune exactly, and stores no pick", () => {
    const r = one({ title: "t", minutes: 4, cells: [{ type: "tool", tool: { type: "melody-singer", pick: { difficulty: "easy", stage: "nope" }, key: "c" } }] });
    assert.ok(r.warnings.some((w) => w.includes("no tune matched the pick exactly; used tune")));
    assert.ok(!JSON.stringify(r.config).includes("pick"));
  });
});

describe("cells", () => {
  const cells = [
    { type: "text", text: "Listen to the chords" },
    { type: "tool", tool: { type: "guitar-play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: ["Am", "F"], bars: 2 } } },
    { type: "section", heading: "Now sing", minutes: 3, choice: { options: [{ key: "d" }, { key: "a" }] }, cells: [
      { type: "list", items: ["a", "", "b"] },
      { type: "tool", tool: { type: "scale-neck", scale: "nope", key: "a" } },
      { type: "section", heading: "Deeper", cells: [{ type: "text", text: "no" }] },
      { type: "notice", notice: "headphones" },
    ] },
    { type: "heading", text: "Old" },
    { type: "link", href: "/theory/ears" },
    { type: "text", text: "" },
  ];
  const plan = (ex: object) => {
    const p = JSON.parse(week());
    p.days[0].exercises[0] = { title: "T", minutes: 5, ...ex };
    return parsePlanConfig(JSON.stringify(p), entries);
  };
  it("parses each kind, a section with its choice and cells, and says what it left out", () => {
    const got = cells.map((c) => parseCellDiag(c));
    assert.deepEqual(got.map((p) => p.cell?.type ?? null), ["text", "tool", "section", null, null, null]);
    const section = got[2].cell as Extract<Cell, { type: "section" }>;
    assert.equal(section.heading, "Now sing");
    assert.equal(section.minutes, 3);
    assert.deepEqual(section.choice, { options: [{ key: 2 }, { key: 9 }] });
    assert.deepEqual(section.cells, [{ type: "list", items: ["a", "b"] }, { type: "notice", notice: "headphones" }]);
    assert.ok(got[2].notes.includes('"Now sing": left out a scale-neck (unknown scale "nope").'), got[2].notes.join("|"));
    assert.ok(got[2].notes.includes('"Now sing": left out a section inside a section.'), got[2].notes.join("|"));
    assert.equal(got[3].dropped, 'a cell of type "heading" (write a section instead)');
    assert.equal(got[4].dropped, 'a cell of unknown type "link"');
    assert.equal(got[5].dropped, "a text (it was empty)");
    assert.equal(parseCellDiag({ type: "notice", notice: "coffee" }).dropped, 'a notice of unknown kind "coffee"');
    assert.equal(parseCellDiag({ type: "section", heading: "", cells: [{ type: "text", text: "x" }] }).dropped, "a section with no heading");
    assert.equal(parseCellDiag({ type: "section", heading: "H", cells: [{ type: "text", text: "" }] }).dropped, 'the section "H" (no cell in it could be shown)');
    assert.deepEqual(toolsOf([cells[1], got[2].cell!] as Cell[]).map((t) => t.type), ["guitar-play-along"]);
    assert.deepEqual(cellsOf([got[0].cell!, got[2].cell!]).map((c) => c.type), ["text", "list", "notice"]);
  });
  it("in a plan: keeps the order, drops what can't be shown and says so", () => {
    const r = plan({ cells });
    assert.ok(r.ok);
    const got = r.config.days[0].exercises[0].cells;
    assert.deepEqual(got.map((s) => s.type), ["text", "tool", "section"]);
    assert.ok(r.warnings.includes('Day 1, exercise 1: "Now sing": left out a scale-neck (unknown scale "nope").'), r.warnings.join("\n"));
    assert.ok(r.warnings.includes("Day 1, exercise 1: left out a text (it was empty)."));
    assert.ok(r.warnings.includes('Day 1, exercise 1: left out a cell of type "heading" (write a section instead).'));
  });
  it("a reply still written with sections gets its title as one text cell and a warning saying so", () => {
    const r = plan({ sections: [{ type: "text", text: "x" }] });
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].cells, [{ type: "text", text: "T" }]);
    assert.ok(r.warnings.includes('Day 1, exercise 1: has no cells (did you write "sections"?).'), r.warnings.join("\n"));
  });
  it("level and area: kept when known, and a missing tag warns", () => {
    const r = plan({ level: "beginner", area: "voice", tags: ["sing"], topic: "voice-pitch", cells: [{ type: "text", text: "Sing." }] });
    assert.ok(r.ok);
    const ex = r.config.days[0].exercises[0];
    assert.equal(ex.level, "beginner");
    assert.equal(ex.area, "voice");
    assert.ok(!r.warnings.some((w) => /^Day 1, exercise 1: no (level|area|kind|topic)/.test(w)));
    const bad = plan({ level: "expert", area: "drums", cells: [{ type: "text", text: "Play." }] });
    assert.ok(bad.ok);
    assert.equal(bad.config.days[0].exercises[0].level, undefined);
    assert.equal(bad.config.days[0].exercises[0].area, undefined);
    assert.ok(bad.warnings.includes("Day 1, exercise 1: no level, area, kind, topic tag."));
  });
  it("tags: known ones, plus multi-octave from a wide ears tool, also inside a section", () => {
    const r = plan({ tags: ["ear", "made-up"], cells: [{ type: "section", heading: "H", cells: [{ type: "tool", tool: { type: "interval-ears", level: 2, wide: true } }] }] });
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].tags, ["ear", "multi-octave"]);
    const plain = plan({ cells: [{ type: "tool", tool: { type: "interval-ears", level: 2 } }] });
    assert.ok(plain.ok);
    assert.equal(plain.config.days[0].exercises[0].tags, undefined);
  });
  it("more than 24 cells are cut, sections' cells counted", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ type: "text", text: `t${i}` }));
    const r = plan({ cells: [{ type: "section", heading: "H", cells: many.slice(0, 20) }, ...many.slice(20)] });
    assert.ok(r.ok);
    assert.equal(cellsOf(r.config.days[0].exercises[0].cells).length, 24);
    assert.ok(r.warnings.includes("Day 1, exercise 1: kept the first 24 of 30 cells."));
  });
});

describe("link slots", () => {
  const plan = (ex: object) => {
    const p = JSON.parse(week());
    p.days[0].exercises[0] = { title: "T", minutes: 5, cells: [{ type: "text", text: "x" }], ...ex };
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    return r;
  };
  it("pasted slots are checked, deduped, capped at 3; a link in both stays in Learn before", () => {
    const r = plan({ learnBefore: ["/course/2/one-minute-changes", "/nope", "/course/2/one-minute-changes"], exploreMore: ["/course/2/one-minute-changes", "/theory/scales/dorian/d", "/theory/ears", "/theory/chords", "/tuner"] });
    const ex = r.config.days[0].exercises[0];
    assert.deepEqual(ex.learnBefore, ["/course/2/one-minute-changes"]);
    assert.deepEqual(ex.exploreMore, ["/theory/scales/dorian/d", "/theory/ears", "/theory/chords"]);
    assert.ok(r.warnings.some((w) => w.includes('"/nope"')));
  });
  it("no slots: no fields", () => {
    const ex = plan({}).config.days[0].exercises[0];
    assert.equal(ex.learnBefore, undefined);
    assert.equal(ex.exploreMore, undefined);
  });
  it("links show the page's real name", () => {
    assert.equal(linkLabel("/course/2/one-minute-changes", entries), "One-minute changes");
    assert.match(linkLabel("/theory/scales/minor-pentatonic/f-sharp", entries) ?? "", / in F♯$/);
    assert.equal(linkLabel("/nope", entries), undefined);
    assert.equal(linkLabel("/course/1/spider", entries, true), "The spider");
    assert.equal(linkLabel("/course/2/one-minute-changes", entries, true), "One-minute changes");
  });
});

describe("the interface the prompt lists", () => {
  it("every section has a schema; the tools are the components' docs", () => {
    assert.equal(cellInterface().length, 5);
    const tools = toolInterface().join("\n");
    const listed = [...tools.matchAll(/^- (\S+) : /gm)].map((m) => m[1]).sort();
    const docs = COMPONENT_DOCS.filter((d) => d.kind !== "shape" && d.name !== "step-choice").map((d) => d.name).sort(); // step-choice is a choice now, no tool (its component is renamed in Task 10)
    assert.deepEqual(listed, docs);
    for (const d of COMPONENT_DOCS.filter((d) => d.kind === "shape")) assert.ok(tools.includes(d.name), d.name);
    assert.ok(tools.includes(STAGES[0].title));
    assert.match(tools, /highlight/);
    assert.match(tools, /wide/);
  });
  it("links are a few templates, not a line per page", () => {
    const lines = linkResources(entries);
    assert.ok(lines.length < 15);
    assert.ok(lines.some((l) => l.startsWith("- /theory/scales/{scale}/{key}") && l.includes("dorian")));
    assert.ok(lines.some((l) => l.includes("/theory/ears")));
    assert.ok(lines.join("\n").length < entries.map((e) => `${e.href} : ${e.label} (${e.desc})`).join("\n").length / 2);
  });
});

describe("parsePlanConfig", () => {
  it("reads a fenced reply with prose around it", () => {
    const r = parsePlanConfig(`Here you go!\n\`\`\`json\n${week()}\n\`\`\`\nEnjoy`, entries);
    assert.ok(r.ok);
    assert.equal(r.config.days.length, 7);
    assert.deepEqual(real(r.warnings), []);
  });
  it("drops unknown links with a warning, keeps the exercise", () => {
    const r = parsePlanConfig(week(["/nope", "/theory/ears"]), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].exploreMore, undefined);
    assert.deepEqual(r.config.days[1].exercises[0].exploreMore, ["/theory/ears"]);
    assert.equal(real(r.warnings).length, 1);
  });
  it("refuses short plans, empty days and bad JSON", () => {
    assert.equal(parsePlanConfig(JSON.stringify({ days: [day(1)] }), entries).ok, false);
    const empty = JSON.parse(week());
    empty.days[3].exercises = [];
    assert.equal(parsePlanConfig(JSON.stringify(empty), entries).ok, false);
    assert.equal(parsePlanConfig("{ nope", entries).ok, false);
    assert.equal(parsePlanConfig("hello", entries).ok, false);
  });
  it("keeps focus", () => {
    const p = JSON.parse(week());
    Object.assign(p.days[0].exercises[0], { focus: "A minor pentatonic · boxes 1 & 2" });
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].focus, "A minor pentatonic · boxes 1 & 2");
  });
  it("clamps minutes", () => {
    const p = JSON.parse(week());
    p.days[0].exercises[0].minutes = 999;
    p.days[1].exercises[0].minutes = "x";
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].minutes, 120);
    assert.equal(r.config.days[1].exercises[0].minutes, 10);
  });
});

describe("schedule", () => {
  const r = parsePlanConfig(week(), entries);
  assert.ok(r.ok);
  const plan: StoredPlan = { id: "a", config: r.config, startedOn: "2026-10-26", done: {} };
  it("counts days from the start, across months", () => {
    assert.equal(dayIndex("2026-10-26", "2026-10-26"), 0);
    assert.equal(dayIndex("2026-10-30", "2026-11-02"), 3);
    assert.equal(dayIndex("2026-10-26", "2026-10-20"), 0);
    assert.equal(localDate(new Date(2026, 0, 5)), "2026-01-05");
  });
  it("the week ends after day 7 or when day 7 is done", () => {
    assert.equal(weekOver(plan, "2026-11-01"), false);
    assert.equal(weekOver(plan, "2026-11-02"), true);
    const done = { ...plan, done: { "6:0": true as const } };
    assert.equal(dayProgress(done, 6), 1);
    assert.equal(weekOver(done, "2026-11-01"), true);
  });
  it("the next prompt reports last week", () => {
    const done = { ...plan, done: { "0:0": true as const }, feedback: "too easy" };
    assert.match(weekReport(done), /\[done\] Ex 1/);
    assert.match(weekReport(done), /\[skipped\] Ex 2/);
    const prompt = buildPrompt(DEFAULT_ANSWERS, entries, [done]);
    assert.match(prompt, /This week, by topic/);
    assert.match(prompt, /\[done\] Ex 1/);
    assert.match(prompt, /too easy/);
    assert.match(prompt, /\/theory\/notes/);
    assert.match(prompt, /"type":\s*"backing-band"/);
    assert.match(prompt, /"type":\s*"guitar-play-along"/);
    assert.ok(!prompt.includes("chord-backing"));
    assert.match(prompt, /"type":\s*"backing-track"/);
    assert.match(prompt, /Never write frets or note lists the app can compute/);
    for (const old of ["band", "comp", "sing", "scale", "chords"]) assert.ok(!prompt.includes(`"type": "${old}"`), old);
    assert.match(prompt, /Notes outside the scale/);
    assert.match(prompt, /two scale-neck tools in that order/);
    assert.match(prompt, /inputSchema/);
    assert.match(prompt, /Rules for good exercises/);
    assert.match(prompt, /multi-octave/);
    for (const t of GLOSSARY) assert.ok(prompt.includes(t.forms[0]), t.id);
    assert.doesNotMatch(buildPrompt(DEFAULT_ANSWERS, entries), /Earlier weeks/);
  });
  it("lists common mistakes with placement and note-name highlights", () => {
    const prompt = buildPrompt(null, []);
    assert.match(prompt, /## Common mistakes/);
    assert.ok(prompt.includes('"placement"'));
    assert.ok(prompt.includes('"c-sharp"'));
    assert.ok(prompt.includes('"view": "tab"'));
    assert.ok(prompt.includes("{{b7}}"));
  });
});

describe("the prompt's examples", () => {
  it("every example exercise parses, its play-alongs keep their minutes", () => {
    for (const ex of EXERCISE_EXAMPLES.map((e) => e.exercise as { title: string; minutes: number })) {
      const p = JSON.parse(week());
      p.days[0].exercises[0] = ex;
      const r = parsePlanConfig(JSON.stringify(p), entries);
      assert.ok(r.ok, ex.title);
      assert.equal(real(r.warnings).length, 0, ex.title);
      assert.equal(r.config.days[0].exercises[0].minutes, ex.minutes, ex.title);
    }
  });
  it("play-along's under is kept when known, dropped when not", () => {
    const base = { type: "guitar-play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7"], bars: 1, steps: ["3"] } };
    assert.equal((parseTool({ ...base, under: "drone" }) as { under?: string }).under, "drone");
    assert.equal((parseTool({ ...base, under: "loud" }) as { under?: string }).under, undefined);
  });
});
