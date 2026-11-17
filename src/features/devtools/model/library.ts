import { SEED_PLANS, type SeedPlanFile } from "@/features/library/seed";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import type { PlanAnswers } from "@/features/plan/model/types";

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
  /** "seed": a plan in src/features/library/seed (the demos' plans among them, under the ids `DEMO_PLANS` names) */
  source: "seed";
  enabledForReuse: boolean;
}

/**
 * The seed plans (src/features/library/seed/plans, one file each, the former plan examples among them) as library rows,
 * enabled for reuse, each with the answers, model and versions its file records. A plan that doesn't parse is left out.
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
