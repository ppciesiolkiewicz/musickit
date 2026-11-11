import { PLAN_EXAMPLES } from "./examples";
import type { Level, PlanConfig } from "./model/types";
import type { Area } from "./model/concepts";

/**
 * The plans anyone can open without writing a prompt, at `/demo/<slug>`: six of the hand-tuned example plans, so a link in a pitch
 * shows what the AI plan looks like when it is done. The slug is the link; the plan is the example's `id`.
 */
export const DEMO_PLANS: Record<string, { example: string; label: string }> = {
  "guitar-beginner": { example: "guitar-beginner", label: "Guitar for a beginner" },
  "voice-beginner": { example: "voice-beginner", label: "Voice for a beginner" },
  "guitar-intermediate": { example: "guitar-intermediate", label: "Guitar for an intermediate player" },
  "voice-intermediate": { example: "voice-intermediate", label: "Voice for an intermediate singer" },
  "guitar-advanced": { example: "guitar-advanced", label: "Guitar for an advanced player" },
  "voice-advanced": { example: "voice-advanced", label: "Voice for an advanced singer" },
};

/** The demo plan behind a slug, or null when there is none. */
export function demoPlan(slug: string): { label: string; config: PlanConfig } | null {
  const demo = Object.hasOwn(DEMO_PLANS, slug) ? DEMO_PLANS[slug] : null;
  const ex = demo && PLAN_EXAMPLES.find((p) => p.id === demo.example);
  return demo && ex ? { label: demo.label, config: ex.plan as PlanConfig } : null;
}

/** What the /demo index shows of one demo plan: who it is for, its week's title and summary, and each day's theme. */
export interface DemoCard {
  slug: string;
  label: string;
  /** the plan's first area: the group the card sits in */
  area: Area;
  level: Level;
  minutes: number;
  title: string;
  summary: string;
  themes: string[];
}

const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];

/** Every demo plan as a card, easiest first. */
export function demoCards(): DemoCard[] {
  return Object.entries(DEMO_PLANS)
    .flatMap(([slug, demo]) => {
      const ex = PLAN_EXAMPLES.find((p) => p.id === demo.example);
      if (!ex) return [];
      const plan = ex.plan as PlanConfig;
      return [{
        slug,
        label: demo.label,
        area: ex.areas[0],
        level: ex.level,
        minutes: ex.minutes,
        // "Week 1: one note makes the mode" → "One note makes the mode": every demo is a first week
        title: plan.title.replace(/^Week \d+:\s*/, "").replace(/^./, (c) => c.toUpperCase()),
        summary: plan.summary ?? "",
        themes: plan.days.map((d) => d.theme),
      }];
    })
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
}
