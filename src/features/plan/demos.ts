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
  return r.ok ? { label: demo.label, config: spreadOverWeek(r.config) } : null;
}

/**
 * A plan of fewer than seven days laid over a week, the way a teacher's week of fewer practice days is stored: its days
 * at uneven steps, some back to back and some with a gap (three days: today, tomorrow, in 4 days), the days between
 * them empty, so the demo shows a mixed week of practice and rest days with their real dates. Seven days, or one, come
 * back as they are.
 */
const MIXED_WEEK: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 1, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 4, 5, 6],
};

export function spreadOverWeek(config: PlanConfig): PlanConfig {
  const n = config.days.length;
  if (n < 2 || n >= 7) return config;
  const days = Array.from({ length: 7 }, () => ({ theme: "", exercises: [] as PlanConfig["days"][number]["exercises"] }));
  config.days.forEach((d, k) => { days[MIXED_WEEK[n][k]] = d; });
  return { ...config, days };
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
