import { ALL_SECTIONS, sectionHref } from "@/features/course/course";
import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { topicsFor, type Topic } from "@/features/plan/intake/topics";
import { AREAS, CONCEPTS, type Area, type Concept } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { conceptSteps, type ConceptStep, type ConceptSteps } from "./steps";

/*
 * The learning path as it is in the code today, shaped for the diagram on /dev/path: an area's topics as lanes, the
 * four levels as columns, each concept in its cell, and an arrow for every `buildsOn`. Nothing here is written by
 * hand: it reads CONCEPTS, TOPICS, the course and the example library.
 */

/** What the path is drawn from; the real catalogue unless a test hands in its own. */
export interface PathSource {
  concepts: Concept[];
  /** example id and the concept ids it works on */
  exercises: { id: string; concepts: string[] }[];
  plans: { id: string; concepts: string[] }[];
  /** hrefs of course sections that are written (a planned one has no blocks) */
  written: Set<string>;
  /** the steps inside a concept, by concept id (model/steps.ts) */
  steps: Record<string, ConceptSteps>;
}

export const pathSource = (): PathSource => ({
  concepts: CONCEPTS,
  exercises: EXERCISE_EXAMPLES,
  plans: PLAN_EXAMPLES,
  steps: conceptSteps(),
  written: new Set(ALL_SECTIONS.filter((r) => r.section.blocks.length > 0).map((r) => sectionHref(r.stage.slug, r.section.slug))),
});

export interface PathNode {
  id: string;
  label: string;
  area: Area;
  topic: string;
  /** 0 to 3: the index in LEVEL_ORDER, and the column */
  level: number;
  /** concepts to know first, in any area */
  buildsOn: string[];
  /** concepts that name this one in their `buildsOn` */
  leadsTo: string[];
  course?: string;
  /** "none": no course page named; "planned": the section is only an outline */
  courseState: "written" | "planned" | "none";
  /** ids of the example exercises tagged with it */
  exercises: string[];
  /** ids of the example plans tagged with it */
  plans: string[];
  /** the levels inside the concept, easiest first: read from a ladder in the code, or planned ("not implemented") */
  steps: ConceptStep[];
  /** the ladder the implemented steps are read from */
  stepsFrom?: string;
}

export interface PathLane {
  topic: Topic;
  /** one cell per level, lowest first; a cell's concepts in catalogue order */
  cells: PathNode[][];
}

export interface AreaPath {
  area: Area;
  label: string;
  lanes: PathLane[];
  /** every `buildsOn` with both ends in this area, as [from, to]: from is learned first */
  edges: [string, string][];
  /** `buildsOn` that reach into another area, as [from, to] */
  outside: [string, string][];
}

/** Every concept as a node, by id. */
export function pathNodes(src: PathSource = pathSource()): Map<string, PathNode> {
  const nodes = new Map<string, PathNode>();
  const tagged = (list: PathSource["exercises"], id: string) => list.filter((e) => e.concepts.includes(id)).map((e) => e.id);
  for (const c of src.concepts) {
    nodes.set(c.id, {
      id: c.id, label: c.label, area: c.area, topic: c.topic, level: LEVEL_ORDER.indexOf(c.level),
      buildsOn: (c.buildsOn ?? []).filter((id) => src.concepts.some((x) => x.id === id)),
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

/** One area's path: its questionnaire topics as lanes, in questionnaire order. */
export function areaPath(area: Area, nodes: Map<string, PathNode> = pathNodes()): AreaPath {
  const own = [...nodes.values()].filter((n) => n.area === area);
  const lanes = topicsFor(area).map((topic) => ({
    topic,
    cells: LEVEL_ORDER.map((_, level) => own.filter((n) => n.topic === topic.id && n.level === level)),
  }));
  const edges: [string, string][] = [], outside: [string, string][] = [];
  for (const n of own) for (const from of n.buildsOn) (nodes.get(from)!.area === area ? edges : outside).push([from, n.id]);
  return { area, label: AREAS.find((a) => a.id === area)!.label, lanes, edges, outside };
}

/** The concept with everything it rests on and everything that rests on it, however far. */
export function chain(id: string, nodes: Map<string, PathNode>): Set<string> {
  const out = new Set<string>([id]);
  const walk = (from: string, next: (n: PathNode) => string[]) => {
    for (const to of next(nodes.get(from)!)) {
      if (out.has(to)) continue;
      out.add(to);
      walk(to, next);
    }
  };
  if (nodes.has(id)) {
    walk(id, (n) => n.buildsOn);
    walk(id, (n) => n.leadsTo);
  }
  return out;
}

/** What the path lacks, counted over the nodes given. */
export function gaps(list: PathNode[]): { concepts: number; noExercise: number; noPlan: number; planned: number; noSteps: number; stepsPlanned: number } {
  return {
    noSteps: list.filter((n) => n.steps.length === 0).length,
    stepsPlanned: list.reduce((sum, n) => sum + n.steps.filter((s) => s.planned).length, 0),
    concepts: list.length,
    noExercise: list.filter((n) => n.exercises.length === 0).length,
    noPlan: list.filter((n) => n.plans.length === 0).length,
    planned: list.filter((n) => n.courseState !== "written").length,
  };
}

/** A label broken into at most two lines of about `width` characters; the second is cut with "…" when it is longer. */
export function wrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(" ");
  let first = "";
  while (words.length && (first ? first.length + 1 : 0) + words[0].length <= width) first += (first ? " " : "") + words.shift();
  if (!first) first = words.shift()!;
  const rest = words.join(" ");
  if (!rest) return [first];
  return [first, rest.length > width ? `${rest.slice(0, width - 1).trimEnd()}…` : rest];
}
