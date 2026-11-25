import { SEED_BLOCKS, seedExercises } from "@/features/library/seed";
import type { Genre } from "@/features/library/seed/genres";
import { catalogue, type CatalogueEntry } from "@/features/plan/model/catalogue";
import { conceptId } from "@/features/plan/model/concepts";
import { parseExercise } from "@/features/plan/model/config";
import { PATH, stepAt, stepOf } from "@/features/plan/model/path";
import { toolsOf } from "@/features/plan/model/tools";
import type { PlanExercise } from "@/features/plan/model/types";

/*
 * Every block in the code, by the path step it practises, for /admin/content/path and /admin/content/block: the seed blocks, one entry per
 * choice (not in the database until db:seed-blocks runs; a seed plan's days name them, so its exercises are among them). A seed block names its
 * steps (`steps` in the file); any other exercise counts where its tools say a step (`stepOf`), or else, as the library
 * matches today, for every step of its track at its level. Database blocks carry no steps yet
 * (docs/superpowers/specs/2026-11-16-blocks-by-step-design.md), so they are not here.
 */

export type StepBlockSource = "seed block";

export interface StepBlock {
  /** unique on the page: the file id, and for a plan's exercise its day and place */
  id: string;
  title: string;
  source: StepBlockSource;
  /** "named": the exercise lists the step in `steps`; "read": the exercise's tools say it; "level": it tags the track and its
   *  level is the step's, nothing more (the way the library matches today) */
  how: "named" | "read" | "level";
  /** the exercise exactly as it is written, for ExamplePreview */
  json: string;
  /** set on a genre's block (a riff): a dead end hung off the step, not a block that teaches it, so it fills no gap and is not in the step's count */
  genre?: Genre;
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

/** Every block in the code by step ref ("trackId:n"): in each list, the ones that name the step, then read, then level. */
export function blocksByStep(entries: CatalogueEntry[] = catalogue()): Map<string, StepBlock[]> {
  const by = new Map<string, StepBlock[]>();
  const each = (e: PlanExercise, level: string | undefined, b: Omit<StepBlock, "how">) => {
    for (const ref of e.steps ?? []) add(by, ref, { ...b, how: "named" });
    for (const { ref, how } of stepsOf(e, level)) add(by, ref, { ...b, how });
  };
  for (const f of SEED_BLOCKS) {
    for (const raw of seedExercises(f)) {
      const { block } = parseExercise(raw, f.id, entries);
      // one choice is the file; more are told apart by their choice ids
      const id = f.choices.length > 1 ? String(raw.choiceId) : f.id;
      const b = { id, title: block?.title ?? f.id, source: "seed block" as const, json: JSON.stringify(raw), ...(f.genre ? { genre: f.genre } : {}) };
      // a warm-up practises no step (DayShape2): it is under none, whatever its tools or level say
      if (block && block.kind !== "warm-up") each(block, block.level, b);
    }
  }
  return by;
}

/** A genre's block (a riff) hung off a step: a dead end there, which no step waits for. `draft`: switched off, in no plan yet. */
export interface GenreMark { id: string; title: string; genre: Genre; draft: boolean }

/** The genre blocks of the seed by the step each hangs off, for the coloured chips on /admin/content/path's slope. */
export function genreMarks(): Record<string, GenreMark[]> {
  const by: Record<string, GenreMark[]> = {};
  for (const f of SEED_BLOCKS) {
    if (!f.genre) continue;
    const title = String(f.exercise.title ?? f.id).replace(/(\s+#[\w-]+)+\s*$/, "");
    for (const ref of new Set(f.choices.flatMap((c) => c.steps))) {
      if (!stepAt(ref, PATH)) continue;
      (by[ref] ??= []).push({ id: f.id, title, genre: f.genre, draft: f.choices.every((c) => c.draft === true) });
    }
  }
  return by;
}

/** The blocks that teach a step: its list without the genre blocks hung off it. */
export const teaching = (list: StepBlock[] = []): StepBlock[] => list.filter((b) => !b.genre);

/** How many blocks practise each step, for the badges on /admin/content/path. A genre's block is not counted: the slope draws it as a dead end. */
export const blockCounts = (by: Map<string, StepBlock[]> = blocksByStep()): Record<string, number> =>
  Object.fromEntries([...by].map(([ref, list]) => [ref, teaching(list).length]));
