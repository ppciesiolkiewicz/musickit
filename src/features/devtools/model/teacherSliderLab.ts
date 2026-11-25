import { topicById, type Rung } from "@/features/plan/intake/topics";
import { conceptById, type Area } from "@/features/plan/model/concepts";
import { outcome } from "@/features/plan/model/outcome";
import { addDays } from "@/features/plan/model/schedule";
import { setScores } from "@/features/plan/model/teacherScores";
import { raisedAnswers } from "@/features/plan/model/topicLevels";
import { EMPTY_STATE, type PlanAnswers } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";
import { tenth } from "@/features/students/model/sliders";
import type { TopicSlider } from "@/features/students/model/types";
import { EXAMPLE_STUDENTS, exampleRatings, type ExampleStudent } from "./stepProgress";

/*
 * The teacher's sliders on three made-up students, for /admin/dev/questionnaire (`QuestionnaireLab`): what each slider opens at,
 * where its start-of-plan tick sits, and what the plan maker gets when one is moved. The students come from
 * `EXAMPLE_STUDENTS` (the /admin/content/path ones). Nothing here reads the clock: "now" is the day after the newest rating.
 */

/** A day the examples' "days ago" are counted from; only the spacing between the dates matters. */
const ANCHOR = "2026-06-01";
/** The current week began this many days before now, so the tick shows the score the day before that. */
const WEEK_DAYS = 3;

export interface LabSample {
  id: "new" | "weeks" | "many";
  label: string;
  answers: PlanAnswers;
  entries: ProgressEntry[];
  /** now: the day after the newest rating (the anchor day with none), yyyy-mm-dd */
  asOf: string;
}

const LABELS = { new: "Brand new: answers only", weeks: "A few weeks in: some ratings", many: "Many ratings" } as const;

/** A student keeping only the ratings given at most `days` days before the examples' last day; `days` of 0 or less keeps none. */
export const cutRatings = (s: ExampleStudent, days: number): ExampleStudent => ({ ...s, ratings: s.ratings.filter((r) => r[3] <= days) });

const answersOf = (s: ExampleStudent): PlanAnswers => ({
  areas: [...new Set(Object.keys(s.topics).map((t) => topicById(t)!.area))] as Area[],
  topics: s.topics, minutes: 20, styles: "", notes: "",
});

/** The progress log of an example student: one entry per rating, at noon, naming the concept and the step it was on. */
function entriesOf(s: ExampleStudent): ProgressEntry[] {
  return exampleRatings(s, ANCHOR).map((r, i) => {
    const topic = conceptById(r.concept)?.topic;
    return {
      id: `r${i}`, planId: "lab", exerciseId: `x${i}`, day: 0, exercise: i, title: r.concept, topic, concepts: [r.concept],
      steps: r.step === null ? undefined : [`${r.concept}:${Number(r.step) + 1}`], stars: r.stars, at: `${r.on}T12:00:00`,
    };
  });
}

function sample(id: LabSample["id"], s: ExampleStudent): LabSample {
  const entries = entriesOf(s);
  const newest = entries.map((e) => e.at.slice(0, 10)).sort().at(-1);
  return { id, label: LABELS[id], answers: answersOf(s), entries, asOf: newest ? addDays(newest, 1) : ANCHOR };
}

/** Brand new (answers, no ratings), a few weeks in (the same student with the last month of ratings), and many ratings (a student moving fast). */
export function sampleStudents(): LabSample[] {
  const slow = EXAMPLE_STUDENTS.find((s) => s.id === "guitar-slow")!;
  const fast = EXAMPLE_STUDENTS.find((s) => s.id === "guitar-fast")!;
  return [sample("new", cutRatings(slow, 0)), sample("weeks", cutRatings(slow, 30)), sample("many", fast)];
}

const input = (s: LabSample, teacherScores?: ReturnType<typeof setScores>["teacherScores"]) => ({
  plans: [], entries: s.entries, times: [], teacherScores, answersHistory: [{ at: `${addDays(s.asOf, -400)}T12:00:00`, topics: s.answers.topics }],
});

/** The sliders of a sample: a topic of each of its areas, opening at the score on `asOf`, the tick at the score the day before the current week began. */
export function labSliders(s: LabSample): TopicSlider[] {
  const today = outcome(input(s), s.asOf).areas.flatMap((a) => a.topics);
  const start = outcome(input(s), addDays(s.asOf, -WEEK_DAYS - 1)).areas.flatMap((a) => a.topics);
  return s.answers.areas.flatMap((area) =>
    today.filter((t) => t.area === area).map((t) => ({
      topic: t.topic, label: t.label, area, now: tenth(t.score ?? 0), atStart: tenth(start.find((x) => x.topic === t.topic)?.score ?? 0),
    })),
  );
}

export interface Received {
  topic: string;
  label: string;
  moved: boolean;
  /** the rung the plan maker is given for the topic (0 New to 3 Advanced), with no move and with it */
  rungBefore: Rung;
  rungAfter: Rung;
  /** the score the progress outcome shows, before and after (null: nothing known) */
  scoreBefore: number | null;
  scoreAfter: number | null;
}

/** What the plan maker receives for each topic of a sample when the sliders in `moves` (topic to value) are moved on `asOf`: the levelled answers' rung and the outcome score, before and after. */
export function receive(s: LabSample, moves: Record<string, number>): Received[] {
  const sliders = labSliders(s);
  const now = Object.fromEntries(sliders.map((t) => [t.topic, t.now]));
  const at = `${s.asOf}T12:00:00`;
  const scores = setScores(EMPTY_STATE, moves, at, now, s.asOf).teacherScores;
  const before = raisedAnswers(s.answers, s.entries, s.asOf).topics;
  const after = raisedAnswers(s.answers, s.entries, s.asOf, scores).topics;
  const o0 = outcome(input(s), s.asOf).areas.flatMap((a) => a.topics);
  const o1 = outcome(input(s, scores), s.asOf).areas.flatMap((a) => a.topics);
  return sliders.map((t) => ({
    topic: t.topic, label: t.label, moved: scores.some((x) => x.topic === t.topic),
    rungBefore: before[t.topic] ?? 0, rungAfter: after[t.topic] ?? 0,
    scoreBefore: o0.find((x) => x.topic === t.topic)?.score ?? null, scoreAfter: o1.find((x) => x.topic === t.topic)?.score ?? null,
  }));
}
