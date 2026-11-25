import { CONCEPTS } from "@/features/plan/model/concepts";
import { LADDERS, type Ladder, type Step } from "@/features/plan/model/ladders";
import { stepOf as trackStepOf } from "@/features/plan/model/path";
import type { PlanTool } from "@/features/plan/model/tools";
import type { Level } from "@/features/plan/model/types";

/*
 * The steps inside each concept, for /admin/content/path: the steps of its track on the learning path (plan/model/path.ts). A step
 * a ladder in the code stands for (plan/model/ladders.ts) can be read back from an exercise's tools; the others are
 * "not implemented" until a tool has a level for them. A step's key is its place in the track, from 0, as text.
 */

export { LADDERS, type Ladder, type Step };

export interface ConceptStep extends Step {
  level: Level;
  /** nothing in the code stands for it yet */
  planned: boolean;
  /** its place in the track, from 0; only a step a ladder stands for has one, since only it can be read and tracked */
  key?: string;
  /** steps of other concepts to learn first, as "conceptId:n", n counted from 1 */
  after?: string[];
}

export interface ConceptSteps {
  steps: ConceptStep[];
  /** the ladders its implemented steps are read from */
  from?: string;
}

/** Every concept's steps, by id. */
export function conceptSteps(): Record<string, ConceptSteps> {
  const out: Record<string, ConceptSteps> = {};
  for (const c of CONCEPTS) {
    const ladders = [...new Set(c.steps.flatMap((s) => (s.ladder ? [s.ladder.split(":")[0]] : [])))].map((id) => LADDERS.find((l) => l.id === id)!);
    out[c.id] = {
      steps: c.steps.map((s, i) => ({ name: s.name, holds: s.holds, level: s.level, planned: !s.ladder, ...(s.ladder ? { key: String(i) } : {}), ...(s.after ? { after: s.after } : {}) })),
      ...(ladders.length ? { from: ladders.map((l) => `${l.label} (${l.file})`).join("; ") } : {}),
    };
  }
  return out;
}

/** The step of a concept an exercise works on, as its key (`ConceptStep.key`); null when no tool says one. */
export function stepOf(concept: string, tools: PlanTool[]): string | null {
  const at = trackStepOf(concept, tools);
  return at === null ? null : String(at);
}

/** Whether a concept has any step a ladder stands for. */
export const hasLadder = (concept: string): boolean => !!CONCEPTS.find((c) => c.id === concept)?.steps.some((s) => s.ladder);

/** The ladder steps no step of the path stands for, per ladder; a ladder fully used is left out. */
export interface SpareSteps { ladder: Pick<Ladder, "id" | "label" | "file">; steps: Step[] }

// plain data: the page hands it from the server to the view, and a ladder's `read` can't cross
export function spareSteps(): SpareSteps[] {
  const used = new Set(CONCEPTS.flatMap((c) => c.steps.flatMap((s) => (s.ladder ? [s.ladder] : []))));
  return LADDERS.flatMap((ladder) => {
    const steps = ladder.steps.filter((s) => !used.has(`${ladder.id}:${s.key}`));
    return steps.length ? [{ ladder: { id: ladder.id, label: ladder.label, file: ladder.file }, steps: steps.map(({ name, holds }) => ({ name, holds })) }] : [];
  });
}
