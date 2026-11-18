import type { PlanAnswers } from "@/features/plan/intake/answers";
import type { AddedStudent } from "./types";

/** What the teacher has typed and picked so far in Add a student. */
export interface AddDraft {
  name: string;
  email: string;
  answers: PlanAnswers;
}

/** A failed add: `field` puts the line under that field on the first screen; without it the line is on the last screen. */
export interface AddError {
  field?: "name" | "email";
  text: string;
}

/** Which screen a route's error belongs on: a name or email error under its field, anything else on the last screen. */
export function placeError(code: string, text: string): AddError {
  if (code === "name") return { field: "name", text };
  if (code === "email" || code === "exists" || code === "taught" || code === "listed") return { field: "email", text };
  return { text };
}

/** What the add flow does with an answer: the screen to show, the draft (never changed by an answer), the error, or the student. */
export interface AfterAdd {
  step: number;
  draft: AddDraft;
  error: AddError | null;
  added?: AddedStudent;
}

/**
 * The add flow's answer to `postStudent`'s result, sent from the last screen (`last`). Added: the student, and the flow
 * closes. A name, email or exists error: back to the first screen with the line under its field. Anything else (the
 * limit, offline, a failure): the last screen with the line. Whatever went wrong, the draft stays as it was typed.
 */
export function afterAdd(result: ({ ok: true } & AddedStudent) | { ok: false; code: string; error: string }, draft: AddDraft, last: number): AfterAdd {
  if (result.ok) return { step: last, draft, error: null, added: { student: result.student, plan: result.plan, mail: result.mail } };
  const error = placeError(result.code, result.error);
  return { step: error.field ? 0 : last, draft, error };
}
