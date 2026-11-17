import type { Plan } from "../plans";

/**
 * The selling words on the plan cards, here and on /account/setup. The plans themselves (name, price, allowance,
 * students) are rows in the database; what each is for and what it gives in plain words is written here, by plan id.
 * A plan with no entry shows its database lines only.
 */

/** Who a plan is for: the switch over the plans. A Teacher plan is for teachers; Student is for someone on their own. */
export type Audience = "individual" | "teachers";
export const audienceOf = (p: Pick<Plan, "role">): Audience => (p.role === "teacher" ? "teachers" : "individual");

export const AUDIENCES: { id: Audience; label: string; line: string }[] = [
  { id: "individual", label: "Individual", line: "For your own practice" },
  { id: "teachers", label: "Teachers", line: "For you and your students" },
];

/** Over the plans of each audience: what every plan on that side gives, said once. */
export const AUDIENCE_LEAD: Record<Audience, string> = {
  individual: "One plan, monthly or yearly. You get a daily practice plan made for your level and your time, plus every tool to practise with.",
  teachers: "Everything in Individual, plus a practice plan for each of your students and lesson notes you can send as a link.",
};

export type Pitch = {
  /** One line under the name: who it is for. */
  forWho: string;
  /** What it gives, in the player's words, before the allowance lines. */
  points: string[];
};

export const PLAN_PITCH: Record<string, Pitch> = {
  student: {
    forWho: "For you, if you're learning guitar or voice on your own.",
    points: [
      "A practice plan made for your level and the minutes you have",
      "Each new plan builds on how the last one went",
      "Every tool, lesson and drill, as much as you like",
      "Interactive notes where every diagram plays",
    ],
  },
  "teacher-basic": {
    forWho: "For you and your own students.",
    points: [
      "Share a practice plan with each student as a link",
      "Send lesson notes when a lesson ends",
    ],
  },
  "teacher-pro": {
    forWho: "For a busy teaching week, or a small school.",
    points: [
      "Share a practice plan with each student as a link",
      "Send lesson notes when a lesson ends",
      "More AI autoplans, for more students",
    ],
  },
  "teacher-unlimited": {
    forWho: "For a school with lots of students.",
    points: [
      "Share a practice plan with each student as a link",
      "Send lesson notes when a lesson ends",
      "We'll set it up together",
    ],
  },
};

export const pitchOf = (p: Pick<Plan, "id">): Pitch | null => PLAN_PITCH[p.id] ?? null;
