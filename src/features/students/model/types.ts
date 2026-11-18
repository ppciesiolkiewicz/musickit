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

/** What `GET /api/students` answers: the students, newest first, and how many the teacher's plan allows (null: any number). */
export interface StudentList {
  students: StudentRow[];
  limit: number | null;
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
