import { EXERCISE_EXAMPLES, PLAN_EXAMPLES, type ExerciseExample, type PlanExample } from "../examples";
import { levelOf } from "../intake/answers";
import type { Level, PlanAnswers } from "./types";

const ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];

/**
 * The examples the prompt shows: every exercise in the library (each labelled with its area and level in the prompt,
 * so the AI sees the whole range of good exercises), and the one plan that fits the player: most shared areas, then
 * the closest level, then the one written to the newer teaching skills (`docs.teaching`) over an older one on the same topic.
 */
export function selectExamples(a: PlanAnswers): { exercises: ExerciseExample[]; plan: PlanExample } {
  const areas = a.areas;
  const mean = areas.length ? areas.reduce((s, x) => s + ORDER.indexOf(levelOf(a, x)), 0) / areas.length : 1;
  const score = (p: PlanExample) => [
    p.areas.filter((x) => areas.includes(x)).length,
    -Math.abs(ORDER.indexOf(p.level) - mean),
    -p.areas.filter((x) => !areas.includes(x)).length,
    p.docs.teaching,
  ];
  const better = (p: PlanExample, q: PlanExample) => {
    const [s, t] = [score(p), score(q)];
    const i = s.findIndex((v, k) => v !== t[k]);
    return i < 0 ? 0 : t[i] - s[i];
  };
  const plan = [...PLAN_EXAMPLES].sort(better)[0];
  return { exercises: [...EXERCISE_EXAMPLES], plan };
}
