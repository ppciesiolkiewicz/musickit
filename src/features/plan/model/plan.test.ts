import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue, checkLink } from "./catalogue";
import { parsePlanConfig } from "./config";
import { buildPrompt, weekReport } from "./prompt";
import { degreeSemis, legacySections, linkResources, parseSection, parseTool, sectionInterface, sectionsOf, toolFromLink, toolInterface } from "./tools";
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
    assert.deepEqual(parseTool({ type: "scale", scale: "minor-pentatonic", key: "a", boxes: [2, 1, 9] }), { type: "scale", scale: "minor-pentatonic", key: 9, boxes: [1, 2] });
    assert.deepEqual(parseTool({ type: "scale", scale: "minor-blues", key: "a", boxes: [1], add: ["c#", "C-sharp", "zz"] }), { type: "scale", scale: "minor-blues", key: 9, boxes: [1], add: [1] });
    assert.deepEqual(parseTool({ type: "chords", chords: ["G", "Em", "nonsense!", 3] }), { type: "chords", chords: ["G", "Em"] });
    assert.deepEqual(parseTool({ type: "sing", scale: "major-ionian", key: "c", voice: "alto" }), { type: "sing", scale: "major-ionian", key: 0, voice: "alto" });
    assert.deepEqual(parseTool({ type: "band", bpm: 70, key: "e", parts: ["drone", "drone", "kazoo"] }), { type: "band", bpm: 70, key: 4, parts: ["drone"] });
    assert.deepEqual(parseTool({ type: "notes", strings: "E,A", from: 0, to: 5 }), { type: "notes", query: "strings=E%2CA&from=0&to=5" });
  });
  it("reads degrees for highlighting and showing only chosen notes", () => {
    assert.equal(degreeSemis("b7"), 10);
    assert.equal(degreeSemis("♭3"), 3);
    assert.equal(degreeSemis("#4"), 6);
    assert.equal(degreeSemis("x"), null);
    assert.deepEqual(parseTool({ type: "scale", scale: "mixolydian", key: "a", highlight: ["1", "3", "5", "b7", "zz"] }), { type: "scale", scale: "mixolydian", key: 9, highlight: [0, 4, 7, 10] });
    assert.deepEqual(parseTool({ type: "sing", scale: "mixolydian", key: "a", notes: ["1", "3", "5", "♭7"] }), { type: "sing", scale: "mixolydian", key: 9, voice: "baritone", notes: [0, 4, 7, 10] });
    assert.equal((parseTool({ type: "sing", scale: "mixolydian", key: "a", notes: ["1"] }) as { notes?: number[] }).notes, undefined);
  });
  it("parses a progression to play as arpeggios or comping", () => {
    assert.deepEqual(parseTool({ type: "comp", chords: ["Am", "F", "C", "nonsense!"], patterns: ["arp-up", "strum", "kazoo"], bpm: 72 }), { type: "comp", chords: ["Am", "F", "C"], patterns: ["arp-up", "strum"], bpm: 72, beats: 4 });
    assert.deepEqual(parseTool({ type: "comp", chords: ["G"], patterns: [] }), { type: "comp", chords: ["G"], patterns: ["arp-up"], bpm: 80, beats: 4 });
    assert.equal(parseTool({ type: "comp", chords: [], patterns: ["arp-up"] }), null);
  });
  it("ears stay inside an octave unless wide", () => {
    assert.deepEqual(parseTool({ type: "ears", set: [3, 4, 7, 10], dir: "down" }), { type: "ears", query: "set=3%2C4%2C7%2C10&dir=down" });
    assert.deepEqual(parseTool({ type: "ears", level: 2, wide: true }), { type: "ears", query: "level=2&wide=1", wide: true });
  });
  it("refuses what it can't show", () => {
    assert.equal(parseTool({ type: "scale", scale: "nope", key: "a" }), null);
    assert.equal(parseTool({ type: "scale", scale: "dorian", key: "zz" }), null);
    assert.equal(parseTool({ type: "chords", chords: [] }), null);
    assert.equal(parseTool({ type: "kazoo" }), null);
  });
  it("reads an older plan's link as a tool", () => {
    assert.deepEqual(toolFromLink("/theory/scales/minor-pentatonic/a"), { type: "scale", scale: "minor-pentatonic", key: 9 });
    assert.deepEqual(toolFromLink("/theory/notes?mode=find#x"), { type: "notes", query: "mode=find" });
    assert.equal(toolFromLink("/theory/metronome-drone")?.type, "band");
    assert.equal(toolFromLink("/theory/chords"), null);
  });
  it("a pasted plan keeps the tools it can show, with a warning for the rest", () => {
    const p = JSON.parse(week());
    p.days[0].exercises[0].tools = [{ type: "chords", chords: ["G", "C"] }, { type: "scale", scale: "nope", key: "a" }];
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].sections?.filter((x) => x.type === "tool"), [{ type: "tool", tool: { type: "chords", chords: ["G", "C"] } }]);
    assert.equal(r.warnings.length, 1);
  });
});

describe("sections", () => {
  const sections = [
    { type: "text", text: "Play the chords" },
    { type: "tool", tool: { type: "comp", chords: ["Am", "F"], patterns: ["arp-up"] } },
    { type: "heading", text: "Now sing" },
    { type: "list", items: ["a", "", "b"] },
    { type: "tool", tool: { type: "scale", scale: "nope", key: "a" } },
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
    const r = plan({ tags: ["ear", "made-up"], sections: [{ type: "tool", tool: { type: "ears", level: 2, wide: true } }] });
    assert.ok(r.ok);
    assert.deepEqual(r.config.days[0].exercises[0].tags, ["ear", "multi-octave"]);
    const plain = plan({ sections: [{ type: "tool", tool: { type: "ears", level: 2 } }] });
    assert.ok(plain.ok);
    assert.equal(plain.config.days[0].exercises[0].tags, undefined);
  });
  it("an older exercise (how / steps / tools) becomes sections, each step followed by its tools", () => {
    const r = plan({ how: "Slide", steps: ["Box 1", "Box 2"], tools: [{ type: "band", bpm: 60, key: "a", parts: ["click"] }, { type: "chords", chords: ["Am"], step: 2 }], link: "/theory/ears" });
    assert.ok(r.ok);
    const got = r.config.days[0].exercises[0].sections!;
    assert.deepEqual(got.map((s) => s.type), ["tool", "text", "text", "text", "tool", "link"]);
    assert.deepEqual(got.map((s) => s.type === "tool" ? s.tool.type : ""), ["band", "", "", "", "chords", ""]);
  });
  it("a plan stored before sections still shows: its link stands for a tool", () => {
    assert.deepEqual(sectionsOf({ how: "Do it", link: "/theory/scales/dorian/e" }).map((s) => s.type), ["tool", "text"]);
    assert.deepEqual(legacySections({ link: "/theory/chords" }), [{ type: "link", href: "/theory/chords" }]);
    assert.deepEqual(sectionsOf({ sections: [{ type: "text", text: "x" }] }), [{ type: "text", text: "x" }]);
  });
  it("parseSection checks links against the pages", () => {
    assert.equal(parseSection({ type: "link", href: "/theory/ears" }, entries)?.type, "link");
    assert.equal(parseSection({ type: "link", href: "https://evil.example" }, entries), null);
    assert.equal(parseSection({ type: "kazoo" }, entries), null);
  });
});

describe("the interface the prompt lists", () => {
  it("every section and tool has a schema, from the same specs the parser uses", () => {
    assert.equal(sectionInterface().length, 5);
    const tools = toolInterface().join("\n");
    for (const name of ["scale", "chords", "sing", "band", "comp", "notes", "ears"]) assert.match(tools, new RegExp(`^- ${name} : `, "m"));
    assert.match(tools, /"highlight"/);
    assert.match(tools, /"wide"/);
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
    assert.match(prompt, /"type": "band"/);
    assert.match(prompt, /Notes outside the scale/);
    assert.match(prompt, /two scale tools in that order/);
    assert.match(prompt, /inputSchema/);
    assert.match(prompt, /Rules for good exercises/);
    assert.match(prompt, /multi-octave/);
    assert.doesNotMatch(buildPrompt(DEFAULT_ANSWERS, entries), /Earlier weeks/);
  });
});
