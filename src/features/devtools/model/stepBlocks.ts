import { SEED_BLOCKS, SEED_PLANS } from "@/features/library/seed";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { conceptId } from "@/features/plan/model/concepts";
import { parseExercise, parsePlanConfig } from "@/features/plan/model/config";
import { PATH, stepAt, stepOf } from "@/features/plan/model/path";
import { toolsOf } from "@/features/plan/model/tools";
import type { PlanExercise } from "@/features/plan/model/types";

/*
 * Every block in the code, by the path step it practises, for /dev/path and /dev/block: the seed blocks (the library's
 * gap blocks, not in the database until db:seed-blocks runs), the seed plans' exercises, and the plan and exercise
 * examples. A seed block names its steps (`steps` in the file); any other exercise counts where its tools say a step
 * (`stepOf`), or else, as the library matches today, for every step of its track at its level. Database blocks carry no steps yet
 * (docs/superpowers/specs/2026-11-16-blocks-by-step-design.md), so they are not here.
 */

export type StepBlockSource = "seed block" | "seed plan" | "exercise example" | "plan example";

export interface StepBlock {
  /** unique on the page: the file id, and for a plan's exercise its day and place */
  id: string;
  title: string;
  source: StepBlockSource;
  /** "named": the seed file lists the step; "read": the exercise's tools say it; "level": it tags the track and its
   *  level is the step's, nothing more (the way the library matches today) */
  how: "named" | "read" | "level";
  /** the exercise exactly as it is written, for ExamplePreview */
  json: string;
}

/** The steps an exercise practises by its tools ("read"), or else every step of its track at its level ("level"). */
function stepsOf(e: PlanExercise, level: string | undefined): { ref: string; how: "read" | "level" }[] {
  const tools = toolsOf(e.cells);
  return (e.concepts ?? []).flatMap((c): { ref: string; how: "read" | "level" }[] => {
    const id = conceptId(c) ?? c;
    const track = PATH.find((t) => t.id === id);
    if (!track) return [];
    const i = stepOf(id, tools);
    if (i !== null) return [{ ref: `${id}:${i + 1}`, how: "read" as const }];
    return track.steps.flatMap((st, j) => (st.level === level ? [{ ref: `${id}:${j + 1}`, how: "level" as const }] : []));
  });
}

const RANK: Record<StepBlock["how"], number> = { named: 0, read: 1, level: 2 };

function add(by: Map<string, StepBlock[]>, ref: string, b: StepBlock) {
  if (!stepAt(ref, PATH)) return;
  const list = by.get(ref) ?? [];
  if (!list.some((x) => x.id === b.id)) list.push(b);
  by.set(ref, list.sort((x, y) => RANK[x.how] - RANK[y.how]));
}

function planExercises(plan: unknown, entries: CatalogueEntry[]): { e: PlanExercise; raw: unknown; at: string }[] {
  const r = parsePlanConfig(JSON.stringify(plan), entries);
  if (!r.ok) return [];
  const days = (plan as { days?: { exercises?: unknown[] }[] }).days ?? [];
  return r.config.days.flatMap((d, i) => d.exercises.map((e, j) => ({ e, raw: days[i]?.exercises?.[j], at: `day ${i + 1}, ${j + 1}` })));
}

/** Every block in the code by step ref ("trackId:n"): in each list, the ones that name the step, then read, then level. */
export function blocksByStep(entries: CatalogueEntry[] = catalogue()): Map<string, StepBlock[]> {
  const by = new Map<string, StepBlock[]>();
  const each = (e: PlanExercise, level: string | undefined, b: Omit<StepBlock, "how">) => {
    for (const { ref, how } of stepsOf(e, level)) add(by, ref, { ...b, how });
  };
  for (const f of SEED_BLOCKS) {
    const { block } = parseExercise(f.exercise, f.id, entries);
    const b = { id: f.id, title: block?.title ?? f.id, source: "seed block" as const, json: JSON.stringify(f.exercise) };
    for (const ref of f.steps ?? []) add(by, ref, { ...b, how: "named" });
    if (block) each(block, block.level, b);
  }
  for (const f of SEED_PLANS) {
    for (const { e, raw, at } of planExercises(f.plan, entries)) each(e, e.level, { id: `${f.id} (${at})`, title: e.title, source: "seed plan", json: JSON.stringify(raw) });
  }
  for (const x of EXERCISE_EXAMPLES) {
    const { block } = parseExercise(x.exercise, x.id, entries);
    if (block) each(block, block.level ?? x.level, { id: x.id, title: block.title, source: "exercise example", json: JSON.stringify(x.exercise) });
  }
  for (const p of PLAN_EXAMPLES) {
    for (const { e, raw, at } of planExercises(p.plan, entries)) each(e, e.level ?? p.level, { id: `${p.id} (${at})`, title: e.title, source: "plan example", json: JSON.stringify(raw) });
  }
  return by;
}

/** How many blocks practise each step, for the badges on /dev/path. */
export const blockCounts = (by: Map<string, StepBlock[]> = blocksByStep()): Record<string, number> =>
  Object.fromEntries([...by].map(([ref, list]) => [ref, list.length]));
