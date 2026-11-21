/**
 * Active students: a teacher's plan limits the students they give a training plan in a calendar month, not the list.
 * A student is active from the day the teacher adds them (with a first week), makes their next week or rotates their
 * week, until the month ends. Each plan has a few extra students a month on top of its limit (`extraStudents`), so a
 * busy month never stops a teacher mid-week. Pure, so the server and the page count and word it the same way.
 */

/** The teacher's places this month: the plan's limit (null: any number), its extra students, and how many are active. */
export interface Places {
  limit: number | null;
  extra: number;
  active: number;
}

/** The first day of `today`'s month, yyyy-mm-dd. */
export const monthStart = (today: string): string => `${today.slice(0, 7)}-01`;

/** Whether a student last given a plan on `plannedOn` (the teacher's day, yyyy-mm-dd) is active in `today`'s month. */
export const activeOn = (plannedOn: string | null, today: string): boolean => !!plannedOn && plannedOn >= monthStart(today);

/**
 * Where the teacher is this month: `open` (no limit), `room` (under the limit), `at-limit` (exactly at it, with every
 * extra left), `extras` (into the extras, `left` of them), `full` (limit and extras used).
 */
export type PlacesState =
  | { kind: "open" }
  | { kind: "room" }
  | { kind: "at-limit"; limit: number; left: number }
  | { kind: "extras"; limit: number; left: number }
  | { kind: "full"; limit: number; extra: number };

export function placesState({ limit, extra, active }: Places): PlacesState {
  if (limit === null) return { kind: "open" };
  const cap = limit + extra;
  if (active >= cap) return { kind: "full", limit, extra };
  if (active < limit) return { kind: "room" };
  return active === limit ? { kind: "at-limit", limit, left: extra } : { kind: "extras", limit, left: cap - active };
}

/** May the teacher give a plan to this student? Always to one already active this month; else only with a place left. */
export const canGive = (p: Places, alreadyActive: boolean): boolean => alreadyActive || placesState(p).kind !== "full";

const students = (n: number): string => `${n} student${n === 1 ? "" : "s"}`;

/** The count beside Add a student: "12 of 15 active students". */
export const countLine = (limit: number, active: number): string => `${active} of ${limit} active students`;

/** The tag on a student's row in the list when they count as active this month. */
export const ACTIVE_TAG = "Active this month";

/** What the count counts, in the (i) beside it. */
export const COUNT_HELP =
  "Students you gave a training plan this month: you added them, made their next week or rotated their week. Everyone else stays on your list for free. The count starts again on the 1st.";

const BIGGER = (limit: number): string => `If you often teach more than ${students(limit)} a month, a bigger plan fits better.`;

/** The notice on the Students page from the limit on; null under it or with no limit. */
export function placesLine(s: PlacesState): string | null {
  if (s.kind === "at-limit") {
    return `You've given plans to the ${students(s.limit)} your plan covers this month. ${s.left} more ${s.left === 1 ? "is" : "are"} on us, so carry on. ${BIGGER(s.limit)}`;
  }
  if (s.kind === "extras") return `${s.left} extra ${s.left === 1 ? "student" : "students"} left this month, on us. ${BIGGER(s.limit)}`;
  if (s.kind === "full") return fullLine(s.limit, s.extra);
  return null;
}

/** Limit and extras used: the Students page's notice, and the route's answer to a plan it refused. */
export const fullLine = (limit: number, extra: number): string =>
  `That's your plan's ${students(limit)}${extra > 0 ? ` and ${extra} extra` : ""} for this month. Students you already gave a plan this month can still get their next week. To add more, change your plan, or send us feedback and we'll find a plan that fits.`;
