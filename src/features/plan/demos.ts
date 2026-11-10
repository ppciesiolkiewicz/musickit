import { PLAN_EXAMPLES } from "./examples";
import type { PlanConfig } from "./model/types";

/**
 * The plans anyone can open without writing a prompt, at `/demo/<slug>`: four of the hand-tuned example plans, so a link in a pitch
 * shows what the AI plan looks like when it is done. The slug is the link; the plan is the example's `id`.
 */
export const DEMO_PLANS: Record<string, { example: string; label: string }> = {
  "guitar-beginner": { example: "guitar-beginner", label: "Guitar for a beginner" },
  "voice-beginner": { example: "voice-beginner", label: "Voice for a beginner" },
  "guitar-intermediate": { example: "guitar-intermediate", label: "Guitar for an intermediate player" },
  "voice-intermediate": { example: "voice-intermediate", label: "Voice for an intermediate singer" },
};

/** The demo plan behind a slug, or null when there is none. */
export function demoPlan(slug: string): { label: string; config: PlanConfig } | null {
  const demo = Object.hasOwn(DEMO_PLANS, slug) ? DEMO_PLANS[slug] : null;
  const ex = demo && PLAN_EXAMPLES.find((p) => p.id === demo.example);
  return demo && ex ? { label: demo.label, config: ex.plan as PlanConfig } : null;
}
