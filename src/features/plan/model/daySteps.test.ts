import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProgressEntry } from "@/features/progress/log";
import { PERSONAS } from "@/features/devtools/model/personas";
import { dayAreas, daySteps, sectionCount, solidRatedAt } from "./daySteps";
import { PATH, stepAt, type Track } from "./path";

const guitar = PERSONAS.find((p) => p.id === "guitar-new")!.answers;
const topicOf = (ref: string) => stepAt(ref)!.track.topic;
const areaOf = (ref: string) => stepAt(ref)!.track.area;
const none = new Map<string, string>();

test("a new guitar player: guitar steps only, one per topic before any topic's second", () => {
  const d = daySteps({ answers: guitar, solid: none, date: "2026-11-18" });
  assert.ok(d.fresh.length > 0);
  assert.ok(d.fresh.every((r) => areaOf(r) === "guitar"));
  const topics = d.fresh.map(topicOf);
  const all = new Set(topics);
  assert.deepEqual(new Set(topics.slice(0, all.size)), all);
});

test("voice only: no guitar or theory step anywhere", () => {
  const solid = new Map([["open-chords:1", "2026-11-01T10:00:00Z"], ["breath:1", "2026-11-02T10:00:00Z"]]);
  const d = daySteps({ answers: { ...guitar, areas: ["voice"] }, solid, date: "2026-11-18" });
  for (const r of [...d.fresh, ...d.open, ...d.review]) assert.equal(areaOf(r), "voice", r);
});

test("a solid step is in review, not fresh, rated longest ago first", () => {
  const solid = new Map([["strumming:1", "2026-11-10T10:00:00Z"], ["open-chords:1", "2026-11-01T10:00:00Z"]]);
  const d = daySteps({ answers: guitar, solid, date: "2026-11-18" });
  assert.deepEqual(d.review, ["open-chords:1", "strumming:1"]);
  assert.ok(!d.fresh.includes("open-chords:1") && !d.open.includes("open-chords:1"));
});

test("a solid step of an area the player did not pick is not in review", () => {
  const theory = PATH.find((t) => t.area === "theory")!;
  const solid = new Map([[`${theory.id}:1`, "2026-11-01T10:00:00Z"]]);
  assert.deepEqual(daySteps({ answers: guitar, solid, date: "2026-11-18" }).review, []);
});

const mk = (id: string, topic: string, n: number): Track => ({
  id, label: id, area: "guitar", topic, merges: [],
  steps: Array.from({ length: n }, () => ({ level: "new", text: "x" })) as unknown as Track["steps"],
});

test("the date rotates which topic opens, not which steps", () => {
  const tracks = [mk("a", "guitar-basic-chords", 1), mk("b", "guitar-scales", 1), mk("c", "guitar-techniques", 1)];
  const a = daySteps({ answers: guitar, solid: none, date: "2026-11-18" }, tracks);
  const b = daySteps({ answers: guitar, solid: none, date: "2026-11-19" }, tracks);
  assert.deepEqual([...a.fresh].sort(), [...b.fresh].sort());
  assert.equal(a.fresh.length, 3);
  assert.notEqual(a.fresh[0], b.fresh[0]);
});

const entry = (steps: string[] | undefined, stars: number, at: string): ProgressEntry =>
  ({ id: at, planId: "p", exerciseId: "e", day: 0, exercise: 0, title: "t", steps, stars, at } as ProgressEntry);

test("solidRatedAt: a rating dates the step and every one before it", () => {
  const m = solidRatedAt([entry(["breath:4"], 5, "2026-11-05T09:00:00Z")]);
  for (const n of [1, 2, 3, 4]) assert.equal(m.get(`breath:${n}`), "2026-11-05T09:00:00Z");
  assert.ok(!m.has("breath:5"));
});

test("solidRatedAt: a later low rating removes it; an entry with no steps adds nothing", () => {
  const m = solidRatedAt([
    entry(["breath:4"], 5, "2026-11-05T09:00:00Z"),
    entry(["breath:4"], 2, "2026-11-06T09:00:00Z"),
    entry(undefined, 5, "2026-11-07T09:00:00Z"),
  ]);
  assert.equal(m.has("breath:4"), false);
  assert.equal(m.has("breath:1"), false);
  assert.equal(solidRatedAt([entry(undefined, 5, "2026-11-07T09:00:00Z")]).size, 0);
});

test("open steps keep the topic order of fresh, one per topic before a topic's second", () => {
  const tracks = [mk("a1", "guitar-basic-chords", 1), mk("a2", "guitar-basic-chords", 1), mk("b1", "guitar-scales", 1), mk("b2", "guitar-scales", 1), mk("c1", "guitar-techniques", 1)];
  for (const date of ["2026-11-18", "2026-11-19", "2026-11-20"]) {
    const d = daySteps({ answers: guitar, solid: none, date }, tracks);
    assert.deepEqual([...d.open].sort(), ["a2", "b2"].map((t) => `${t}:1`));
    assert.deepEqual(d.open.map((r) => r[0]), d.fresh.map((r) => r[0]).filter((l) => l !== "c"), date);
  }
});

test("a topic outside the chosen areas' topics still ends the call, its step kept", () => {
  const odd = { ...mk("z", "guitar-basic-chords", 1), topic: "guitar-not-a-topic" };
  const d = daySteps({ answers: guitar, solid: none, date: "2026-11-18" }, [mk("a", "guitar-basic-chords", 1), odd]);
  assert.deepEqual([...d.fresh].sort(), ["a:1", "z:1"]);
});

test("a broken date does not break the call", () => {
  const d = daySteps({ answers: guitar, solid: none, date: "nope" }, [mk("a", "guitar-basic-chords", 1)]);
  assert.deepEqual(d.fresh, ["a:1"]);
});

// --- the day's areas (DayShape1)

const areasOn = (areas: ("guitar" | "voice" | "theory")[], minutes: number, date: string) => dayAreas({ answers: { areas, minutes }, date }).areas;

test("sectionCount: one section under 30 minutes, two from 30 to 49, three from 50", () => {
  assert.deepEqual([10, 15, 20, 29, 30, 45, 49, 50, 60].map(sectionCount), [1, 1, 1, 1, 2, 2, 2, 3, 3]);
});

test("dayAreas: 20 minutes with guitar and voice is one area, the other one the next day", () => {
  assert.deepEqual(areasOn(["guitar", "voice"], 20, "2026-11-18"), ["guitar"]);
  assert.deepEqual(areasOn(["guitar", "voice"], 20, "2026-11-19"), ["voice"]);
  assert.deepEqual(areasOn(["guitar", "voice"], 20, "2026-11-20"), ["guitar"]);
});

test("dayAreas: the day's areas come voice first, then guitar, then theory, however the player listed them", () => {
  assert.deepEqual(areasOn(["guitar", "voice"], 40, "2026-11-18"), ["voice", "guitar"]);
  assert.deepEqual(areasOn(["theory", "guitar", "voice"], 60, "2026-11-18"), ["voice", "guitar", "theory"]);
});

test("dayAreas: never more sections than areas, and one area is one section at any minutes", () => {
  for (const minutes of [10, 20, 30, 45, 60]) assert.deepEqual(areasOn(["guitar"], minutes, "2026-11-18"), ["guitar"]);
  assert.deepEqual(areasOn(["guitar", "theory"], 60, "2026-11-19"), ["guitar", "theory"]);
});

test("dayAreas: three areas at 40 minutes get two a day, each area two days in three", () => {
  const days = ["2026-11-18", "2026-11-19", "2026-11-20"].map((d) => areasOn(["guitar", "voice", "theory"], 40, d));
  assert.deepEqual(days, [["voice", "guitar"], ["guitar", "theory"], ["voice", "theory"]]);
});

test("dayAreas: the turn is told, with the areas left for a short day in the order the turn reaches them", () => {
  assert.deepEqual(dayAreas({ answers: { areas: ["guitar", "voice", "theory"], minutes: 20 }, date: "2026-11-19" }), { areas: ["guitar"], rest: ["theory", "voice"], picked: ["voice", "guitar", "theory"], count: 1, turn: 1 });
  assert.deepEqual(dayAreas({ answers: { areas: ["guitar"], minutes: 20 }, date: "nope" }).areas, ["guitar"]);
});

test("daySteps: with the day's areas, only their steps; without, every area the player picked", () => {
  const both = { ...guitar, areas: ["guitar", "voice"] as ("guitar" | "voice")[] };
  const solid = new Map([["open-chords:1", "2026-11-01T10:00:00Z"], ["breath:1", "2026-11-02T10:00:00Z"]]);
  const all = daySteps({ answers: both, solid, date: "2026-11-18" });
  assert.deepEqual(new Set([...all.fresh, ...all.review].map(areaOf)), new Set(["guitar", "voice"]));
  const voice = daySteps({ answers: both, solid, date: "2026-11-18", areas: ["voice"] });
  assert.ok(voice.fresh.length > 0);
  for (const r of [...voice.fresh, ...voice.open, ...voice.review]) assert.equal(areaOf(r), "voice", r);
  assert.deepEqual(voice.review, ["breath:1"]);
  assert.deepEqual([...voice.fresh].sort(), all.fresh.filter((r) => areaOf(r) === "voice").sort(), "the same steps as the whole day's has for the area");
});
