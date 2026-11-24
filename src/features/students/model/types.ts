import type { Area } from "@/features/plan/model/concepts";
import type { StoredPlan } from "@/features/plan/model/types";

/**
 * The shapes the students routes send, shared by the server (`server/`) and the page (`client.ts`, `ui/`), so no client
 * file imports from `server/`.
 */

/** A student as the teacher's list shows them, from the account row and the link's dates (ISO strings). */
export interface StudentRow {
  id: string;
  name: string;
  email: string;
  addedAt: string;
  /** when the student first opened the claim link; null until then */
  claimedAt: string | null;
}

/**
 * What `GET /api/students?today=` answers: the students, newest first; how many active students the teacher's plan
 * allows a month (null: any number) and its extras; how many are active this month (`model/places.ts`).
 */
export interface StudentList {
  students: StudentRow[];
  limit: number | null;
  extra: number;
  active: number;
  /** the students active this month (given a week since the 1st), by id; `active` is how many */
  activeIds: string[];
}

/** What happened to the first week when a student was added. */
export type FirstWeek = "made" | "short" | "none";

/** What happened to the claim email: sent, mail turned off on this server, or the send failed. */
export type ClaimMail = "sent" | "off" | "failed";

/** What `POST /api/students` answers when the student was added (the student stays whatever the week and the email did). */
export interface AddedStudent {
  student: StudentRow;
  plan: FirstWeek;
  mail: ClaimMail;
}

/** One slider on a student's page: a topic of the student's areas and its score (0 to 3, the `outcome()` topic score). */
export interface TopicSlider {
  topic: string;
  label: string;
  area: Area;
  /** the score today, 0 when nothing is known */
  now: number;
  /** the score the day before the current week started; null with no week */
  atStart: number | null;
}

/** What `GET /api/students/<id>?today=` answers: the student, their current week (null: none), a slider per topic. */
export interface StudentView {
  student: StudentRow;
  /** the week a teacher made that covers today, else the newest that has started; an upcoming week is not here */
  plan: StoredPlan | null;
  topics: TopicSlider[];
  /** the week the teacher made that hasn't started yet (at most one), by its first day; null when there is none */
  upcoming: { start: string } | null;
  /** the weekdays the student practises (Monday 0 to Sunday 6, in order), as last set; all seven when never set */
  practiceDays: number[];
}

/** What happened to the teacher's comment: kept on the current week, none was sent, or there was no week to keep it on. */
export type CommentKept = "stored" | "none" | "no-week";

/** What `POST /api/students/<id>/plan` answers: the new week, the date it starts, whether some days came out short, the comment. */
export interface MadePlan {
  planId: string;
  start: string;
  short: boolean;
  comment: CommentKept;
}
