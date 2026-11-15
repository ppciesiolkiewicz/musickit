import { modelPlan, type ModelPlan } from "@/features/plan/modelPlans";
import type { PlanAnswers } from "@/features/plan/model/types";
import type { Persona } from "./personas";

/** The model whose plans seed the practice-plan library: the best we have, the one the judge marks the others against. */
export const SEED_MODEL = "claude-fable-5-2";

/** One row of the `practice_plans` table, as `npm run db:seed-plans` writes it. */
export interface LibraryRow {
  id: string;
  title: string;
  answers: PlanAnswers;
  model: string;
  reply: string;
  source: "compare-models";
  enabledForReuse: boolean;
}

/**
 * The published compare-models plans by `model` (Fable 5.2 by default) as library rows, each with its player's answers so
 * it can be matched to a real player, enabled for reuse. A plan that doesn't parse, or whose player is no longer in
 * `personas`, is left out.
 */
export function libraryRows(plans: Record<string, ModelPlan>, personas: Persona[], model: string = SEED_MODEL): LibraryRow[] {
  const rows: LibraryRow[] = [];
  for (const [slug, p] of Object.entries(plans).sort(([a], [b]) => a.localeCompare(b))) {
    if (p.model !== model) continue;
    const persona = personas.find((x) => x.id === p.persona);
    const parsed = modelPlan(slug);
    if (!persona || !parsed) continue;
    rows.push({ id: slug, title: parsed.config.title, answers: persona.answers, model: p.model, reply: p.reply, source: "compare-models", enabledForReuse: true });
  }
  return rows;
}
