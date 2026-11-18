import { ALL_SECTIONS, sectionHref } from "@/features/course/course";
import { SEED_BLOCKS, SEED_PLANS } from "@/features/library/seed";
import { CONCEPTS, conceptIds, type Area, type Concept } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { conceptSteps, type ConceptStep, type ConceptSteps } from "./steps";

/*
 * The learning path (plan/model/path.ts), one node per skill for the Path view of /dev/path: its levels, its steps,
 * what it builds on and leads to (from each step's `after`), its course page and the seed files tagged with it. Nothing
 * here is written by hand: it reads CONCEPTS, the course and the library's seed files.
 */

/** What the path is drawn from; the real catalogue unless a test hands in its own. */
export interface PathSource {
  concepts: Concept[];
  /** seed file id and the concept ids it works on */
  exercises: { id: string; concepts: string[] }[];
  plans: { id: string; concepts: string[] }[];
  /** hrefs of course sections that are written (a planned one has no blocks) */
  written: Set<string>;
  /** the steps inside a concept, by concept id (model/steps.ts) */
  steps: Record<string, ConceptSteps>;
}

interface RawPlan { days?: { exercises?: unknown[] }[] }

/** The known concept ids the exercises as written name (old ids mapped to their track), each once. */
const conceptsOf = (exercises: unknown[]): string[] => conceptIds(exercises.flatMap((e) => (e as { concepts?: string[] }).concepts ?? []));

export const pathSource = (): PathSource => ({
  concepts: CONCEPTS,
  exercises: SEED_BLOCKS.map((f) => ({ id: f.id, concepts: conceptsOf([f.exercise]) })),
  plans: SEED_PLANS.map((f) => ({ id: f.id, concepts: conceptsOf(((f.plan as RawPlan).days ?? []).flatMap((d) => d.exercises ?? [])) })),
  steps: conceptSteps(),
  written: new Set(ALL_SECTIONS.filter((r) => r.section.blocks.length > 0).map((r) => sectionHref(r.stage.slug, r.section.slug))),
});

export interface PathNode {
  id: string;
  label: string;
  area: Area;
  topic: string;
  /** 0 to 3: the index in LEVEL_ORDER of its first step, and the column */
  level: number;
  /** the index of its last step's level: the node spans from `level` to here */
  to: number;
  /** concepts a step of it names to learn first (`after`), in any area */
  buildsOn: string[];
  /** concepts that name this one in their `buildsOn` */
  leadsTo: string[];
  course?: string;
  /** "none": no course page named; "planned": the section is only an outline */
  courseState: "written" | "planned" | "none";
  /** ids of the seed blocks tagged with it */
  exercises: string[];
  /** ids of the seed plans whose exercises are tagged with it */
  plans: string[];
  /** the levels inside the concept, easiest first: read from a ladder in the code, or planned ("not implemented") */
  steps: ConceptStep[];
  /** the ladder the implemented steps are read from */
  stepsFrom?: string;
}

/** Every concept as a node, by id. */
export function pathNodes(src: PathSource = pathSource()): Map<string, PathNode> {
  const nodes = new Map<string, PathNode>();
  const tagged = (list: PathSource["exercises"], id: string) => list.filter((e) => e.concepts.includes(id)).map((e) => e.id);
  for (const c of src.concepts) {
    nodes.set(c.id, {
      id: c.id, label: c.label, area: c.area, topic: c.topic, level: LEVEL_ORDER.indexOf(c.level), to: LEVEL_ORDER.indexOf(c.levels[c.levels.length - 1]),
      buildsOn: [...new Set(c.steps.flatMap((s) => (s.after ?? []).map((ref) => ref.split(":")[0])))].filter((id) => id !== c.id && src.concepts.some((x) => x.id === id)),
      leadsTo: [],
      course: c.course,
      courseState: !c.course ? "none" : src.written.has(c.course) ? "written" : "planned",
      exercises: tagged(src.exercises, c.id),
      plans: tagged(src.plans, c.id),
      steps: src.steps[c.id]?.steps ?? [],
      stepsFrom: src.steps[c.id]?.from,
    });
  }
  for (const n of nodes.values()) for (const from of n.buildsOn) nodes.get(from)!.leadsTo.push(n.id);
  return nodes;
}
