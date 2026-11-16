import { catalogue } from "../model/catalogue";
import { parsePlanConfig } from "../model/config";
import type { PlanConfig } from "../model/types";
import { FILES } from "./plans/index.gen";

/**
 * First-week plans different AI models wrote for made-up players (/dev/compare-models), at `/demo/models/<slug>`. Public so
 * a link can be shared, but listed nowhere: not on /demo, not in the sitemap. One file per plan, `plans/<slug>.json`, written
 * by `npm run -s publish-model-plans` from tools/prompt-history (the newest plan per player and model); don't edit them by hand.
 */
export interface ModelPlan {
  /** the made-up player's id and label (devtools model/personas.ts) */
  persona: string;
  player: string;
  /** the model id and its name */
  model: string;
  modelLabel: string;
  /** the run in tools/prompt-history it was copied from, and when it ran */
  runId: string;
  at: string;
  /** the model's reply, parsed when the page opens */
  reply: string;
  /** the prompt's and the writing rules' versions the run was written to; absent on runs from before they were kept */
  versions?: { prompt: number; agents: number; teaching: number };
}

export const MODEL_PLANS = FILES as Record<string, ModelPlan>;

/** The slug for a player and model: "guitar-new--claude-haiku-5-5", "voice-beginner--ollama-llama3-1-8b". */
export const modelPlanSlug = (persona: string, model: string): string => `${persona}--${model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/** The plan behind a slug, parsed as a pasted reply is, with the parser's warnings; null when there is none or it doesn't parse. */
export function modelPlan(slug: string): (ModelPlan & { config: PlanConfig; warnings: string[] }) | null {
  const p = Object.hasOwn(MODEL_PLANS, slug) ? MODEL_PLANS[slug] : null;
  if (!p) return null;
  const r = parsePlanConfig(p.reply, catalogue());
  return r.ok ? { ...p, config: r.config, warnings: r.warnings } : null;
}
