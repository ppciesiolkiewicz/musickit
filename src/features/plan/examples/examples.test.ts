import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { degreeSemis } from "@/features/exercises/timeline/degrees";
import { blocksOf } from "../model/blocks";
import { catalogue } from "../model/catalogue";
import { mixesSingAndPlay } from "../model/checks";
import { AREAS, conceptById } from "../model/concepts";
import { parsePlanConfig } from "../model/config";
import { notePc, splitNotes } from "../model/noteText";
import type { PlanTool, Section } from "../model/tools";
import type { Level, PlanConfig, PlanExercise } from "../model/types";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES, type ExampleMeta } from "./index";

const entries = catalogue();
const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];
const ALL: ExampleMeta[] = [...EXERCISE_EXAMPLES, ...PLAN_EXAMPLES];

/** A pasted plan of seven copies of one exercise, so the exercise goes through the real paste path. */
const weekOf = (exercise: unknown) => JSON.stringify({ title: "W", days: Array.from({ length: 7 }, (_, i) => ({ theme: `D${i + 1}`, exercises: [exercise] })) });

function parsed(text: string): PlanConfig {
  const r = parsePlanConfig(text, entries);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.config;
}

/** Every exercise as the app stores it, with where it came from. */
const exercises: { where: string; ex: PlanExercise }[] = [
  ...EXERCISE_EXAMPLES.map((e) => ({ where: e.id, ex: parsed(weekOf(e.exercise)).days[0].exercises[0] })),
  ...PLAN_EXAMPLES.flatMap((p) => parsed(JSON.stringify(p.plan)).days.flatMap((d, di) => d.exercises.map((ex, xi) => ({ where: `${p.id} day ${di + 1} #${xi + 1}`, ex })))),
];

describe("example library", () => {
  it("every exercise example parses with zero warnings", () => {
    for (const e of EXERCISE_EXAMPLES) {
      const r = parsePlanConfig(weekOf(e.exercise), entries);
      assert.ok(r.ok, e.id);
      assert.deepEqual(r.warnings, [], e.id);
    }
  });

  it("every plan example parses with zero warnings and has 7 days", () => {
    for (const p of PLAN_EXAMPLES) {
      const raw = p.plan as { days: unknown[] };
      assert.equal(raw.days.length, 7, p.id);
      const r = parsePlanConfig(JSON.stringify(p.plan), entries);
      assert.ok(r.ok, p.id);
      assert.deepEqual(r.warnings, [], p.id);
    }
  });

  it("ids unique; concepts exist (conceptById); areas known", () => {
    assert.equal(new Set(ALL.map((x) => x.id)).size, ALL.length);
    for (const x of ALL) {
      assert.ok(x.concepts.length, x.id);
      for (const c of x.concepts) assert.ok(conceptById(c), `${x.id}: ${c}`);
      assert.ok(x.areas.length && x.areas.every((a) => AREAS.some((k) => k.id === a)), x.id);
      assert.ok(LEVELS.includes(x.level), x.id);
      assert.ok(x.note.trim(), x.id);
    }
  });

  it("block minutes sum to exercise minutes; exercises over 5 min have ≥ 2 blocks of 2-5", () => {
    for (const { where, ex } of exercises) {
      const blocks = blocksOf(ex.sections!);
      if (ex.minutes > 5) assert.ok(blocks.length >= 2, where);
      if (!blocks.length) continue;
      assert.equal(blocks.reduce((n, b) => n + b.minutes, 0), ex.minutes, where);
      for (const b of blocks) assert.ok(b.minutes >= 2 && b.minutes <= 5, `${where}: ${b.title}`);
    }
  });

  it("plan days total their stated minutes ±2", () => {
    for (const p of PLAN_EXAMPLES) {
      parsed(JSON.stringify(p.plan)).days.forEach((d, i) => {
        const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
        assert.ok(Math.abs(total - p.minutes) <= 2, `${p.id} day ${i + 1}: ${total} vs ${p.minutes}`);
      });
    }
  });

  it("no exercise mixes singing and playing", () => {
    for (const { where, ex } of exercises) assert.equal(mixesSingAndPlay(ex.sections!), false, where);
  });

  it("each area × level has an exercise; three showcases exist", () => {
    const plain = EXERCISE_EXAMPLES.filter((e) => !e.showcase);
    for (const a of AREAS) for (const l of LEVELS) assert.ok(plain.some((e) => e.areas[0] === a.id && e.level === l), `${a.id} ${l}`);
    assert.deepEqual(EXERCISE_EXAMPLES.flatMap((e) => (e.showcase ? [e.showcase] : [])).sort(), ["blocks", "pick", "progression"]);
    assert.equal(PLAN_EXAMPLES.length, 4);
  });

  it("JSON files import nothing, are named by id, and are all loaded", () => {
    const dir = join(process.cwd(), "src/features/plan/examples");
    for (const [sub, list] of [["exercises", EXERCISE_EXAMPLES], ["plans", PLAN_EXAMPLES]] as const) {
      const files = readdirSync(join(dir, sub)).filter((f) => f.endsWith(".json"));
      assert.deepEqual(files.map((f) => f.replace(/\.json$/, "")).sort(), list.map((x) => x.id).sort(), sub);
      for (const f of files) {
        const text = readFileSync(join(dir, sub, f), "utf8");
        const json = JSON.parse(text);
        assert.equal(json.id, f.replace(/\.json$/, ""), f);
        assert.ok(!text.includes("$ref") && !/"import"\s*:/.test(text), f);
      }
    }
  });

  it("fits the parser's limits, so nothing is cut on paste", () => {
    for (const { where, ex } of exercises) {
      const tools = ex.sections!.filter((s) => s.type === "tool").length;
      assert.ok(tools <= 6, `${where}: ${tools} tools`);
    }
    const raw = [...EXERCISE_EXAMPLES.map((e) => ({ where: e.id, e: e.exercise })), ...PLAN_EXAMPLES.flatMap((p) => (p.plan as { days: { exercises: unknown[] }[] }).days.flatMap((d) => d.exercises.map((e) => ({ where: p.id, e }))))];
    for (const { where, e } of raw) {
      const x = e as { title: string; focus?: string; why?: string; sections: { type: string; text?: string; items?: string[] }[] };
      assert.ok(x.sections.length <= 24 && x.title.length <= 120 && (x.focus ?? "").length <= 120 && (x.why ?? "").length <= 300, `${where}: ${x.title}`);
      for (const s of x.sections) {
        if (s.type === "heading") assert.ok(s.text!.length <= 100, `${where}: ${s.text}`);
        if (s.type === "text") assert.ok(s.text!.length <= 700, `${where}: ${s.text}`);
        if (s.type === "list") assert.ok(s.items!.length <= 8 && s.items!.every((i) => i.length <= 240), `${where}: ${x.title}`);
      }
    }
  });

  it("named notes are lit in the tool after the text, and the root is never muted", () => {
    for (const { where, ex } of exercises) {
      const sections = ex.sections!;
      sections.forEach((s, i) => {
        if (s.type === "tool") assert.ok(rootLit(s.tool), `${where}: root muted in ${s.tool.type}`);
        const texts = s.type === "text" ? [s.text] : s.type === "list" ? s.items : [];
        const tokens = texts.flatMap((t) => splitNotes(t).flatMap((p) => (typeof p === "string" ? [] : [p.note])));
        if (!tokens.length) return;
        const tool = sections.slice(i + 1).find((x): x is Extract<Section, { type: "tool" }> => x.type === "tool" && rootOf(x.tool) !== null)?.tool;
        if (!tool || !MARKED.includes(tool.type)) return;
        const root = rootOf(tool)!;
        for (const t of tokens) {
          const semi = degreeSemis(t) ?? (notePc(t)! - root + 12) % 12;
          assert.ok(lit(tool, semi, root), `${where}: {{${t}}} not lit in the ${tool.type} after "${texts[0].slice(0, 40)}…"`);
        }
      });
    }
  });
});

const MARKED: PlanTool["type"][] = ["scale-neck", "staff", "arpeggio-neck"];

/** The root the text's degrees count from, as `noteRootFor` reads it (null for tools without one). */
function rootOf(t: PlanTool): number | null {
  if (t.type === "scale-neck" || t.type === "staff") return t.key;
  if (t.type === "arpeggio-neck") return parseChordQuery(t.chord)!.rootPc;
  if (t.type === "chord-shapes") return parseChordQuery(t.chords[0])!.rootPc;
  if (t.type === "play-along") return 0;
  return null;
}

type Marked = Extract<PlanTool, { type: "scale-neck" | "staff" | "arpeggio-neck" }>;

/** Whether the note `semi` above the tool's root is drawn and not faded. */
function lit(tool: PlanTool, semi: number, root: number): boolean {
  const t = tool as Marked;
  if (t.hide?.includes(semi) || t.mute?.includes(semi)) return false;
  if (t.type === "staff" && t.notes && !t.notes.includes(semi)) return false;
  if (t.type === "arpeggio-neck" && t.part && !t.part.some((d) => degreeSemis(d) === semi)) return false;
  const added = t.type === "scale-neck" && t.add?.includes((root + semi) % 12);
  if (t.highlight?.length && (t.others ?? "muted") !== "normal") return t.highlight.includes(semi) || !!added;
  return t.others !== "hidden" && t.others !== "muted";
}

function rootLit(tool: PlanTool): boolean {
  if (!MARKED.includes(tool.type)) return true;
  const t = tool as Marked;
  if (t.type === "arpeggio-neck" && t.part && !t.part.some((d) => degreeSemis(d) === 0)) return true;
  if (t.type === "staff" && t.notes && !t.notes.includes(0)) return true;
  return lit(tool, 0, rootOf(tool)!);
}
