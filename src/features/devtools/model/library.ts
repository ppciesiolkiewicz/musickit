import { SEED_PLANS, type SeedPlanFile } from "@/features/library/seed";
import { PLAN_EXAMPLES, type PlanExample } from "@/features/plan/examples";
import { topicById, type Rung } from "@/features/plan/intake/topics";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import type { Level, PlanAnswers } from "@/features/plan/model/types";

/** One row of the `practice_plans` table, as `npm run db:seed-plans` writes it. */
export interface LibraryRow {
  id: string;
  title: string;
  answers: PlanAnswers;
  model: string;
  reply: string;
  /** the prompt and document versions it was written to; null when the run did not record them */
  promptVersion: number | null;
  docsAgents: number | null;
  docsTeaching: number | null;
  /** "example" for a plan example (its id is the example's, as the demos use), "seed" for a plan in src/features/library/seed */
  source: "example" | "seed";
  enabledForReuse: boolean;
}

/** A block's level as the questionnaire rung of a player it was written for: "new" is "Not yet", "advanced" the top line. */
const RUNG: Record<Level, Rung> = { new: 0, beginner: 1, intermediate: 2, advanced: 3 };

/**
 * The answers a plan example stands for, since an example records none: its areas and minutes, and each topic of those
 * areas its exercises practise, at the rung of the highest level among that topic's exercises. A topic of another area
 * (a theory block in a guitar plan) is left out, as the questionnaire only asks about the areas picked.
 */
export function exampleAnswers(e: PlanExample, days: { exercises: { topic?: string; level?: Level }[] }[]): PlanAnswers {
  const topics: Record<string, Rung> = {};
  for (const x of days.flatMap((d) => d.exercises)) {
    const t = x.topic ? topicById(x.topic) : undefined;
    if (!t || !e.areas.includes(t.area) || !x.level) continue;
    topics[t.id] = Math.max(topics[t.id] ?? 0, RUNG[x.level]) as Rung;
  }
  return { areas: [...e.areas], topics, minutes: e.minutes, styles: "", notes: "" };
}

/**
 * The plan examples (the prompt's, which the demos show) as library rows, enabled for reuse. The id is the example's id,
 * the same one `DEMO_PLANS` names, so a demo and its library plan share it. The reply is the example's plan as the AI
 * returns it; the model and document versions are the example's, the prompt version null (an example records none).
 * An example that doesn't parse is left out.
 */
export function exampleLibraryRows(examples: PlanExample[] = PLAN_EXAMPLES): LibraryRow[] {
  const entries = catalogue();
  return examples.flatMap((e) => {
    const reply = JSON.stringify(e.plan);
    const r = parsePlanConfig(reply, entries);
    if (!r.ok || !e.model) return [];
    return [{ id: e.id, title: r.config.title, answers: exampleAnswers(e, r.config.days), model: e.model, reply, promptVersion: null, docsAgents: e.docs.agents, docsTeaching: e.docs.teaching, source: "example" as const, enabledForReuse: true }];
  });
}

/**
 * The agents' seed plans (src/features/library/seed/plans, one file each) as library rows, enabled for reuse, each with
 * the answers, model and versions its file records. A plan that doesn't parse is left out.
 */
export function seedLibraryRows(files: SeedPlanFile[] = SEED_PLANS): LibraryRow[] {
  const entries = catalogue();
  return files.flatMap((f) => {
    const reply = JSON.stringify(f.plan);
    const r = parsePlanConfig(reply, entries);
    if (!r.ok) return [];
    return [{ id: f.id, title: r.config.title, answers: f.answers, model: f.model, reply, promptVersion: f.versions.prompt, docsAgents: f.versions.agents, docsTeaching: f.versions.teaching, source: "seed" as const, enabledForReuse: true }];
  });
}
