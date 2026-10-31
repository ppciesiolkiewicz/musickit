import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue, checkLink } from "./catalogue";
import { parsePlanConfig } from "./config";
import { GLOSSARY } from "@/features/course/glossary";
import { EXAMPLE, buildPrompt, weekReport } from "./prompt";
import { runChoices } from "@/features/exercises/basics/choices";
import { COMPONENT_DOCS } from "@/features/exercises/docs";
import { expandShape } from "@/features/exercises/shapes";
import { STAGES } from "@/features/theory/singingMelodies";
import { migrateTool } from "./migrate";
import { degreeSemis, derivedMinutes, legacySections, linkResources, parseSection, parseTool, sectionInterface, sectionsOf, toolFromLink, toolInterface } from "./tools";
import { DEFAULT_ANSWERS } from "./questions";
import { dayIndex, dayProgress, localDate, weekOver } from "./schedule";
import type { StoredPlan } from "./types";

const entries = catalogue();
const day = (n: number, link?: string) => ({ theme: `T${n}`, exercises: [{ title: `Ex ${n}`, minutes: 10, how: "do it", ...(link ? { link } : {}) }] });
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
});

describe("tools", () => {
  it("parses each tool, set up for the exercise", () => {
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [2, 1, 9] }), { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1, 2] });
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "minor-blues", key: "a", boxes: [1], add: ["c#", "C-sharp", "zz"], highlight: ["1"], others: "hidden" }), { type: "scale-neck", scale: "minor-blues", key: 9, boxes: [1], add: [1], highlight: [0], others: "hidden" });
    assert.deepEqual(parseTool({ type: "chord-shapes", chords: ["G", "Em", "nonsense!", 3], voicing: "barre" }), { type: "chord-shapes", chords: ["G", "Em"], voicing: "barre" });
    assert.deepEqual(parseTool({ type: "staff", scale: "major-ionian", key: "c", voice: "alto" }), { type: "staff", scale: "major-ionian", key: 0, voice: "alto" });
    assert.deepEqual(parseTool({ type: "backing-band", bpm: 70, key: "e", parts: ["drone", "drone", "kazoo"] }), { type: "backing-band", bpm: 70, key: 4, parts: ["drone"] });
    assert.deepEqual(parseTool({ type: "click-drone", bpm: 60, key: "a", drone: false }), { type: "click-drone", bpm: 60, key: 9, drone: false });
    assert.deepEqual(parseTool({ type: "note-finder", strings: "56", from: 0, to: 5 }), { type: "note-finder", query: "strings=56&from=0&to=5" });
    assert.deepEqual(parseTool({ type: "arpeggio-neck", chord: "Am", boxes: [2, 3], part: ["1", "b3", "zz"], highlight: ["1"] }), { type: "arpeggio-neck", chord: "Am", boxes: [2, 3], part: ["1", "b3"], highlight: [0] });
    assert.equal(parseTool({ type: "arpeggio-neck", chord: "nonsense!" }), null);
    assert.deepEqual(parseTool({ type: "melody-singer", tune: 1, key: "d", voice: "tenor" }), { type: "melody-singer", tune: 1, key: 2, voice: "tenor" });
    assert.equal(parseTool({ type: "melody-singer", tune: 9999, key: "d" }), null);
    assert.deepEqual(parseTool({ type: "run-singer", run: runChoices()[0].id, key: "c" }), { type: "run-singer", run: runChoices()[0].id, key: 0 });
  });
  it("reads degrees for highlighting and showing only chosen notes", () => {
    assert.equal(degreeSemis("b7"), 10);
    assert.equal(degreeSemis("♭3"), 3);
    assert.equal(degreeSemis("#4"), 6);
    assert.equal(degreeSemis("x"), null);
    assert.deepEqual(parseTool({ type: "scale-neck", scale: "mixolydian", key: "a", highlight: ["1", "3", "5", "b7", "zz"] }), { type: "scale-neck", scale: "mixolydian", key: 9, highlight: [0, 4, 7, 10] });
    assert.deepEqual(parseTool({ type: "staff", scale: "mixolydian", key: "a", notes: ["1", "3", "5", "♭7"] }), { type: "staff", scale: "mixolydian", key: 9, voice: "baritone", notes: [0, 4, 7, 10] });
    assert.equal((parseTool({ type: "staff", scale: "mixolydian", key: "a", notes: ["1"] }) as { notes?: number[] }).notes, undefined);
  });
  it("highlights by note name, mutes, hides; dimmed reads as muted", () => {
    const sn = (t: Record<string, unknown>) => parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", ...t }) as Record<string, unknown>;
    assert.deepEqual(sn({ add: ["c-sharp"], highlight: ["c-sharp"] }), { type: "scale-neck", scale: "minor-pentatonic", key: 9, add: [1], highlight: [4] });
    assert.deepEqual(sn({ highlight: ["b3"] }).highlight, [3]);
    const m = sn({ highlight: ["1"], mute: ["5"], hide: ["b7"], others: "hidden" });
    assert.deepEqual([m.mute, m.hide, m.others], [[7], [10], "hidden"]);
    assert.deepEqual((parseTool({ type: "arpeggio-neck", chord: "A7", highlight: ["c-sharp", "g"] }) as { highlight?: number[] }).highlight, [4, 10]);
    assert.equal((parseTool({ type: "staff", scale: "major-ionian", key: "c", highlight: ["3"], others: "dimmed" }) as { others?: string }).others, "muted");
    const stored = parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", highlight: [3], others: "dimmed" }, { stored: true }) as Record<string, unknown>;
    assert.deepEqual([stored.highlight, stored.others], [[3], "muted"]);
    const pa = parseTool({ type: "play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2 }, others: "dimmed" }) as { others?: string };
    assert.equal(pa.others, "muted");
  });
  it("others without a highlight is dropped: it means nothing and would blank or fade the view", () => {
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
  it("a stored sing tool becomes a staff with the mic, its semitones kept", () => {
    assert.deepEqual(parseTool({ type: "sing", scale: "major-ionian", key: 0, voice: "tenor", notes: [0, 4, 7], highlight: [4] }, { stored: true }), { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", notes: [0, 4, 7], highlight: [4], mic: true });
  });
  it("stored scale, chords, band, notes, ears tools take the new names", () => {
    assert.deepEqual(parseTool({ type: "scale", scale: "dorian", key: 4, highlight: [0, 10] }, { stored: true }), { type: "scale-neck", scale: "dorian", key: 4, highlight: [0, 10] });
    assert.deepEqual(parseTool({ type: "chords", chords: ["G"] }), { type: "chord-shapes", chords: ["G"] });
    assert.deepEqual(parseTool({ type: "band", bpm: 60, key: 9, parts: ["click"] }), { type: "backing-band", bpm: 60, key: 9, parts: ["click"] });
    assert.deepEqual(parseTool({ type: "notes", query: "mode=find" }), { type: "note-finder", query: "mode=find" });
    assert.deepEqual(parseTool({ type: "ears", query: "level=2&wide=1", wide: true }), { type: "interval-ears", query: "level=2&wide=1", wide: true });
  });
  it("a stored comp tool becomes a play-along progression", () => {
    const t = parseTool({ type: "comp", chords: ["Am", "F", "C", "G"], patterns: ["arp-up", "strum"], bpm: 80, beats: 4 });
    assert.ok(t && t.type === "play-along");
    assert.equal(t.view, "neck");
    const tl = expandShape({ ...t.shape, bpm: t.bpm });
    assert.ok(tl);
    assert.deepEqual(tl.backingChoices, ["arp-up", "strum"]);
    assert.equal(tl.bars, 4);
    assert.deepEqual(migrateTool({ type: "comp", chords: ["Am", "F", "C"], patterns: ["arp-up"], bpm: 72, beats: 2 }).shape, { shape: "progression", key: "a", chords: ["Am", "F", "C"], bars: 2, beatsPerChord: 2, backing: ["arp-up"] });
  });
  it("an old comp with beats 3 keeps every chord", () => {
    const t = parseTool({ type: "comp", chords: ["C", "Am", "F", "G"], bpm: 80, beats: 3 });
    assert.ok(t && t.type === "play-along");
    const tl = expandShape({ ...t.shape, bpm: t.bpm })!;
    const names = tl.events.filter((e) => e.type === "chord").map((e) => (e as { name: string }).name);
    assert.deepEqual(names.slice(0, 4), ["C", "Am", "F", "G"]);
    assert.deepEqual(tl.events.filter((e) => e.type === "chord").map((e) => e.at).slice(0, 4), [0, 3, 6, 9]);
  });
  it("play-along bpm/repeats inside the shape are a fallback; top-level wins", () => {
    const inner = parseTool({ type: "play-along", shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4, bpm: 70, repeats: 6 } });
    assert.ok(inner && inner.type === "play-along");
    assert.equal(inner.bpm, 70);
    assert.equal(inner.repeats, 6);
    assert.ok(derivedMinutes([{ type: "tool", tool: inner }]) !== null);
    const top = parseTool({ type: "play-along", bpm: 90, repeats: 2, shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4, bpm: 70, repeats: 6 } });
    assert.ok(top && top.type === "play-along");
    assert.equal(top.bpm, 90);
    assert.equal(top.repeats, 2);
  });
  it("numeric degrees: semitones in stored plans, dropped from pasted input", () => {
    const raw = { type: "scale-neck", scale: "mixolydian", key: "a", highlight: [3, "5"] };
    assert.deepEqual((parseTool(raw) as { highlight?: number[] }).highlight, [7]);
    assert.deepEqual((parseTool(raw, { stored: true }) as { highlight?: number[] }).highlight, [3, 7]);
    const p = JSON.parse(week());
    p.days[0].exercises[0] = { title: "x", minutes: 5, sections: [{ type: "tool", tool: raw }] };
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.deepEqual((r.config.days[0].exercises[0].sections?.[0] as { tool: { highlight?: number[] } }).tool.highlight, [7]);
    const stored = sectionsOf({ sections: [{ type: "tool", tool: raw }] } as never);
    assert.deepEqual((stored[0] as { tool: { highlight?: number[] } }).tool.highlight, [3, 7]);
    const legacy = sectionsOf({ tools: [{ type: "sing", scale: "major-ionian", key: 0, voice: "tenor", notes: [0, 3, 7] }] } as never);
    assert.deepEqual((legacy[0] as { tool: { notes?: number[] } }).tool.notes, [0, 3, 7]);
  });
  it("placement: boxes win; by chords resolves from the exercise's chords", () => {
    const both = parseTool({ type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [2], placement: { by: "open" } }) as Record<string, unknown>;
    assert.deepEqual([both.boxes, both.placement], [[2], undefined]);
    assert.deepEqual((parseTool({ type: "arpeggio-neck", chord: "A7", placement: { by: "root", string: 5 } }) as { placement?: unknown }).placement, { by: "root", string: 5 });
    const neck = { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", add: ["c-sharp"], placement: { by: "chords" } } };
    const placed = (sections: unknown[]) => {
      const p = JSON.parse(week());
      p.days[0].exercises[0] = { title: "x", minutes: 5, sections };
      const r = parsePlanConfig(JSON.stringify(p), entries);
      assert.ok(r.ok);
      const s = r.config.days[0].exercises[0].sections!.find((x) => x.type === "tool" && x.tool.type === "scale-neck") as { tool: { placement?: unknown } };
      return s.tool.placement;
    };
    assert.deepEqual(placed([{ type: "tool", tool: { type: "chord-shapes", chords: ["A7", "D7", "E7"] } }, neck]), { by: "open" });
    assert.deepEqual(placed([{ type: "tool", tool: { type: "chord-shapes", chords: ["A7"], voicing: "barre" } }, neck]), { by: "fret", fret: 5 });
    assert.deepEqual(placed([{ type: "tool", tool: { type: "play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: ["A7", "D7"], bars: 2, voicing: "barre" } } }, neck]), { by: "fret", fret: 5 });
    assert.equal(placed([neck]), undefined);
  });
  it("parses a play-along by its shape", () => {
    const shape = { shape: "chord-steps", chords: [{ chord: "G", steps: ["strum", "1", "6", "1"] }, { chord: "D", steps: ["strum", "4", "5", "4"] }], voicing: "barre" };
    const t = parseTool({ type: "play-along", bpm: 70, shape });
    assert.ok(t);
    assert.deepEqual(t, { type: "play-along", bpm: 70, shape });
    assert.deepEqual(parseTool(t), t);
    assert.equal(parseTool({ type: "play-along", bpm: 70, shape: { ...shape, shape: "nonsense" } }), null);
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
  it("reads an older plan's link as a tool", () => {
    assert.deepEqual(toolFromLink("/theory/scales/minor-pentatonic/a"), { type: "scale-neck", scale: "minor-pentatonic", key: 9 });
    assert.deepEqual(toolFromLink("/theory/notes?mode=find#x"), { type: "note-finder", query: "mode=find" });
    assert.equal(toolFromLink("/theory/metronome-drone")?.type, "backing-band");
    assert.equal(toolFromLink("/theory/chords"), null);
  });
  it("a pasted plan keeps the tools it can show, with a warning for the rest", () => {
    const p = JSON.parse(week());
    p.days[0].exercises[0].tools = [{ type: "chords", chords: ["G", "C"] }, { type: "scale", scale: "nope", key: "a" }];
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].sections?.filter((x) => x.type === "tool"), [{ type: "tool", tool: { type: "chord-shapes", chords: ["G", "C"] } }]);
    assert.equal(r.warnings.length, 1);
  });
  it("the prompt's example play-along exercise keeps its minutes after derivation", () => {
    const ex = JSON.parse(EXAMPLE).days[0].exercises.find((e: { sections: { tool?: { type: string } }[] }) => e.sections.some((s) => s.tool?.type === "play-along"));
    const p = JSON.parse(week());
    p.days[0].exercises[0] = ex;
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].minutes, ex.minutes);
  });
  it("a play-along with repeats sets the exercise's minutes", () => {
    const tool = parseTool({ type: "play-along", bpm: 70, repeats: 2, shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4 } });
    assert.ok(tool);
    const m = derivedMinutes([{ type: "text", text: "x" }, { type: "tool", tool }]);
    assert.ok(m !== null && Math.abs(m - 27.43 / 60) < 0.01);
    const loose = parseTool({ type: "play-along", bpm: 70, shape: { shape: "progression", key: "g", chords: ["G", "C"], bars: 4 } });
    assert.ok(loose);
    assert.equal(derivedMinutes([{ type: "tool", tool: loose }]), null);
  });
});

describe("sections", () => {
  const sections = [
    { type: "text", text: "Play the chords" },
    { type: "tool", tool: { type: "play-along", bpm: 80, shape: { shape: "progression", key: "a", chords: ["Am", "F"], bars: 2 } } },
    { type: "heading", text: "Now sing" },
    { type: "list", items: ["a", "", "b"] },
    { type: "tool", tool: { type: "scale-neck", scale: "nope", key: "a" } },
    { type: "link", href: "/theory/ears" },
    { type: "link", href: "/made-up" },
    { type: "text", text: "" },
  ];
  const plan = (ex: object) => {
    const p = JSON.parse(week());
    p.days[0].exercises[0] = { title: "T", minutes: 5, ...ex };
    return parsePlanConfig(JSON.stringify(p), entries);
  };
  it("keeps the order, drops what can't be shown and says so", () => {
    const r = plan({ sections });
    assert.ok(r.ok);
    const got = r.config.days[0].exercises[0].sections!;
    assert.deepEqual(got.map((s) => s.type), ["text", "tool", "heading", "list", "link"]);
    assert.deepEqual(got[3], { type: "list", items: ["a", "b"] });
    assert.equal(r.warnings.length, 1);
  });
  it("tags: known ones, plus multi-octave from a wide ears tool", () => {
    const r = plan({ tags: ["ear", "made-up"], sections: [{ type: "tool", tool: { type: "interval-ears", level: 2, wide: true } }] });
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].tags, ["ear", "multi-octave"]);
    const plain = plan({ sections: [{ type: "tool", tool: { type: "interval-ears", level: 2 } }] });
    assert.ok(plain.ok);
    assert.equal(plain.config.days[0].exercises[0].tags, undefined);
  });
  it("an older exercise (how / steps / tools) becomes sections, each step followed by its tools", () => {
    const r = plan({ how: "Slide", steps: ["Box 1", "Box 2"], tools: [{ type: "band", bpm: 60, key: "a", parts: ["click"] }, { type: "chords", chords: ["Am"], step: 2 }], link: "/theory/ears" });
    assert.ok(r.ok);
    const got = r.config.days[0].exercises[0].sections!;
    assert.deepEqual(got.map((s) => s.type), ["tool", "text", "text", "text", "tool", "link"]);
    assert.deepEqual(got.map((s) => s.type === "tool" ? s.tool.type : ""), ["backing-band", "", "", "", "chord-shapes", ""]);
  });
  it("a plan stored before sections still shows: its link stands for a tool", () => {
    assert.deepEqual(sectionsOf({ how: "Do it", link: "/theory/scales/dorian/e" }).map((s) => s.type), ["tool", "text"]);
    assert.deepEqual(legacySections({ link: "/theory/chords" }), [{ type: "link", href: "/theory/chords" }]);
    assert.deepEqual(sectionsOf({ sections: [{ type: "text", text: "x" }] }), [{ type: "text", text: "x" }]);
    const stored = sectionsOf({ sections: [{ type: "tool", tool: { type: "sing", scale: "major-ionian", key: 0, voice: "tenor" } }] } as never);
    assert.deepEqual(stored, [{ type: "tool", tool: { type: "staff", scale: "major-ionian", key: 0, voice: "tenor", mic: true } }]);
  });
  it("parseSection checks links against the pages", () => {
    assert.equal(parseSection({ type: "link", href: "/theory/ears" }, entries)?.type, "link");
    assert.equal(parseSection({ type: "link", href: "https://evil.example" }, entries), null);
    assert.equal(parseSection({ type: "kazoo" }, entries), null);
  });
});

describe("the interface the prompt lists", () => {
  it("every section has a schema; the tools are the components' docs", () => {
    assert.equal(sectionInterface().length, 5);
    const tools = toolInterface().join("\n");
    const listed = [...tools.matchAll(/^- (\S+) : /gm)].map((m) => m[1]).sort();
    const docs = COMPONENT_DOCS.filter((d) => d.kind !== "shape").map((d) => d.name).sort();
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
    assert.deepEqual(r.warnings, []);
  });
  it("drops unknown links with a warning, keeps the exercise", () => {
    const r = parsePlanConfig(week(["/nope", "/theory/ears"]), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].sections?.some((x) => x.type === "link"), false);
    assert.deepEqual(r.config.days[1].exercises[0].sections?.find((x) => x.type === "link"), { type: "link", href: "/theory/ears" });
    assert.equal(r.warnings.length, 1);
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
    assert.match(prompt, /Earlier weeks/);
    assert.match(prompt, /too easy/);
    assert.match(prompt, /\/theory\/notes/);
    assert.match(prompt, /"type": "backing-band"/);
    assert.match(prompt, /"type": "play-along"/);
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
    for (const ex of JSON.parse(EXAMPLE).days[0].exercises) {
      const p = JSON.parse(week());
      p.days[0].exercises[0] = ex;
      const r = parsePlanConfig(JSON.stringify(p), entries);
      assert.ok(r.ok, ex.title);
      assert.equal(r.warnings.length, 0, ex.title);
      assert.equal(r.config.days[0].exercises[0].minutes, ex.minutes, ex.title);
    }
  });
  it("play-along's under is kept when known, dropped when not", () => {
    const base = { type: "play-along", bpm: 70, shape: { shape: "progression", key: "a", chords: ["A7"], bars: 1, steps: ["3"] } };
    assert.equal((parseTool({ ...base, under: "drone" }) as { under?: string }).under, "drone");
    assert.equal((parseTool({ ...base, under: "loud" }) as { under?: string }).under, undefined);
  });
});
