import { SEED_PLANS, seedPlan } from "@/features/library/seed";
import { catalogue } from "./model/catalogue";
import { parsePlanConfig } from "./model/config";
import type { Level, PlanConfig } from "./model/types";
import type { Area } from "./model/concepts";

/**
 * The plans anyone can open without writing a prompt, at `/demo/<slug>`: six of the library's seed plans, so a link in a
 * pitch shows what the AI plan looks like when it is done. The slug is the link; `plan` is the seed plan's `id`. A seed
 * file records no level, so each demo names the one its card sorts and shows by.
 */
export const DEMO_PLANS: Record<string, { plan: string; label: string; level: Level }> = {
  "guitar-beginner": { plan: "guitar-beginner", label: "Guitar for a beginner", level: "beginner" },
  "voice-beginner": { plan: "voice-beginner", label: "Voice for a beginner", level: "beginner" },
  "guitar-intermediate": { plan: "guitar-intermediate", label: "Guitar for an intermediate player", level: "intermediate" },
  "voice-intermediate": { plan: "voice-intermediate", label: "Voice for an intermediate singer", level: "intermediate" },
  "guitar-advanced": { plan: "guitar-advanced", label: "Guitar for an advanced player", level: "advanced" },
  "voice-advanced": { plan: "voice-advanced", label: "Voice for an advanced singer", level: "advanced" },
};

const seedFile = (id: string) => SEED_PLANS.find((p) => p.id === id);

/** The demo plan behind a slug, parsed as a pasted reply is (keys as pitch classes, tools checked), or null when there is none. */
export function demoPlan(slug: string): { label: string; config: PlanConfig } | null {
  const demo = Object.hasOwn(DEMO_PLANS, slug) ? DEMO_PLANS[slug] : null;
  const file = demo && seedFile(demo.plan);
  if (!demo || !file) return null;
  const r = parsePlanConfig(JSON.stringify(seedPlan(file)), catalogue());
  return r.ok ? { label: demo.label, config: r.config } : null;
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

/** Every demo plan as a card, easiest first; its area and minutes are the ones the seed plan's answers record. */
export function demoCards(): DemoCard[] {
  return Object.entries(DEMO_PLANS)
    .flatMap(([slug, demo]) => {
      const file = seedFile(demo.plan);
      if (!file) return [];
      const plan = seedPlan(file) as unknown as PlanConfig;
      return [{
        slug,
        label: demo.label,
        area: file.answers.areas[0],
        level: demo.level,
        minutes: file.answers.minutes,
        // "Week 1: one note makes the mode" → "One note makes the mode": every demo is a first week
        title: plan.title.replace(/^Week \d+:\s*/, "").replace(/^./, (c) => c.toUpperCase()),
        summary: plan.summary ?? "",
        themes: plan.days.map((d) => d.theme),
      }];
    })
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
}
