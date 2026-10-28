import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogue, checkLink } from "./catalogue";
import { parsePlanConfig } from "./config";
import { buildPrompt, weekReport } from "./prompt";
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
    assert.equal(r.config.days[0].exercises[0].link, undefined);
    assert.equal(r.config.days[1].exercises[0].link, "/theory/ears");
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
  it("keeps focus and steps", () => {
    const p = JSON.parse(week());
    Object.assign(p.days[0].exercises[0], { focus: "A minor pentatonic · boxes 1 & 2", steps: ["Box 1", "", 3, "Box 2"] });
    const r = parsePlanConfig(JSON.stringify(p), entries);
    assert.ok(r.ok);
    assert.equal(r.config.days[0].exercises[0].focus, "A minor pentatonic · boxes 1 & 2");
    assert.deepEqual(r.config.days[0].exercises[0].steps, ["Box 1", "Box 2"]);
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
    assert.doesNotMatch(buildPrompt(DEFAULT_ANSWERS, entries), /Earlier weeks/);
  });
});
