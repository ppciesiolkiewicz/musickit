import { EXERCISE_EXAMPLES, PLAN_EXAMPLES, type ExerciseExample, type PlanExample } from "../examples";
import { AREAS, conceptsFor, type Area } from "./concepts";
import type { Level, PlanAnswers } from "./types";

const ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];
/** Share of a level's shown concepts rated 4-5 that earns an example from the level above. */
const HIGH_SHARE = 0.7;

const areasOf = (a: PlanAnswers): Area[] => AREAS.filter((x) => a.levels[x.id]).map((x) => x.id);

/** The levels to show examples for in this area: the player's, plus the next when they rate it high. */
function levelsFor(a: PlanAnswers, area: Area): Level[] {
  const level = a.levels[area]!;
  const shown = conceptsFor(area, level);
  const high = shown.filter((c) => (a.ratings[c.id] ?? 0) >= 4).length;
  const next = ORDER[ORDER.indexOf(level) + 1];
  return next && shown.length > 0 && high / shown.length >= HIGH_SHARE ? [level, next] : [level];
}

/**
 * The examples the prompt shows: per non-skipped area the exercise at the player's level (and one level up when
 * at least 70% of that level's concepts are rated 4-5), the rule showcases always (the `pick` one only with Voice),
 * and the plan sharing the most areas, then the closest level.
 */
export function selectExamples(a: PlanAnswers): { exercises: ExerciseExample[]; plan: PlanExample } {
  const areas = areasOf(a);
  const exercises = areas.flatMap((area) =>
    levelsFor(a, area).flatMap((level) => EXERCISE_EXAMPLES.filter((e) => !e.showcase && e.areas.includes(area) && e.level === level)),
  );
  for (const e of EXERCISE_EXAMPLES) {
    if (e.showcase && (e.showcase !== "pick" || areas.includes("voice")) && !exercises.includes(e)) exercises.push(e);
  }
  const mean = areas.length ? areas.reduce((s, x) => s + ORDER.indexOf(a.levels[x]!), 0) / areas.length : 1;
  const score = (p: PlanExample) => [
    p.areas.filter((x) => areas.includes(x)).length,
    -Math.abs(ORDER.indexOf(p.level) - mean),
    -p.areas.filter((x) => !areas.includes(x)).length,
  ];
  const better = (p: PlanExample, q: PlanExample) => {
    const [s, t] = [score(p), score(q)];
    const i = s.findIndex((v, k) => v !== t[k]);
    return i < 0 ? 0 : t[i] - s[i];
  };
  const plan = [...PLAN_EXAMPLES].sort(better)[0];
  return { exercises, plan };
}
