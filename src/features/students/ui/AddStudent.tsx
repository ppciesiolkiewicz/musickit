"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Notice, StepModal, type ModalStep } from "@/components/ui";
import { cleanEmail, cleanName, isEmail } from "@/features/account/model";
import { migrateAnswers, type PlanAnswers } from "@/features/plan/intake/answers";
import { questionSteps, type SetAnswer } from "@/features/plan/intake/ui/Questionnaire";
import { localDate } from "@/features/plan/model/schedule";
import { postStudent } from "../client";
import type { AddedStudent } from "../model/types";

/** What the teacher has typed and picked so far. */
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

/** The flow in progress, kept for the tab's life so a reload reopens it where it was (as the plan's flow is). */
export const ADD_KEY = "musickit.students.add";
type Saved = { draft: AddDraft; step: number };

export const emptyDraft = (): AddDraft => ({ name: "", email: "", answers: migrateAnswers(null) });

/** The saved flow, if any (sessionStorage can be blocked). */
export function savedAdd(): Saved | null {
  try {
    const s = JSON.parse(window.sessionStorage.getItem(ADD_KEY) ?? "null") as Saved | null;
    return s && s.draft && typeof s.draft.name === "string" && typeof s.draft.email === "string"
      ? { draft: { ...s.draft, answers: migrateAnswers(s.draft.answers) }, step: typeof s.step === "number" ? s.step : 0 }
      : null;
  } catch {
    return null;
  }
}

function clearAdd(): void {
  try {
    window.sessionStorage.removeItem(ADD_KEY);
  } catch {
    /* ignore */
  }
}

/** The finish button, named in the last screen's words. */
export const ADD_FINISH = "Add student";

/** Which screen a route's error belongs on: a name or email error under its field, anything else on the last screen. */
export function placeError(code: string, text: string): AddError {
  if (code === "name") return { field: "name", text };
  if (code === "email" || code === "exists") return { field: "email", text };
  return { text };
}

const input = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";
const errorLine = "mt-1 text-xs text-rose-300";

const nameOk = (d: AddDraft) => cleanName(d.name) !== "";
const emailOk = (d: AddDraft) => isEmail(cleanEmail(d.email));

/** The first screen: the student's name and email, both required. A line under a field says what's wrong with it. */
export function WhoStep({ draft, onName, onEmail, error }: { draft: AddDraft; onName: (v: string) => void; onEmail: (v: string) => void; error: AddError | null }) {
  // the email's own check waits until the field is left, so it doesn't nag while the address is typed
  const [left, setLeft] = useState(false);
  const emailLine = error?.field === "email" ? error.text : left && draft.email.trim() && !emailOk(draft) ? "Type the whole email address, like ann@school.com." : null;
  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm text-slate-300">
        Name
        <input className={`${input} mt-1`} value={draft.name} onChange={(e) => onName(e.target.value)} autoComplete="off" aria-invalid={error?.field === "name" || undefined} />
        {error?.field === "name" && <p className={errorLine}>{error.text}</p>}
      </label>
      <label className="text-sm text-slate-300">
        Email address
        <input className={`${input} mt-1`} type="email" value={draft.email} onChange={(e) => onEmail(e.target.value)} onBlur={() => setLeft(true)} autoComplete="off" aria-invalid={!!emailLine || undefined} />
        {emailLine && <p className={errorLine}>{emailLine}</p>}
      </label>
    </div>
  );
}

/**
 * Every screen of adding a student: name and email, then the player's questionnaire worded for a student
 * (`questionSteps(…, { forStudent: true })`), then what Add student does, with the error of a failed try.
 */
export function addSteps(draft: AddDraft, setDraft: (change: (d: AddDraft) => AddDraft) => void, error: AddError | null, busy: boolean, onFieldEdit: () => void): ModalStep[] {
  const set: SetAnswer = (k, v) => setDraft((d) => ({ ...d, answers: { ...d.answers, [k]: v } }));
  const who: ModalStep = {
    title: "Who is your student?",
    hint: "Both are needed. attunr emails your student a link to log in.",
    canNext: nameOk(draft) && emailOk(draft),
    body: (
      <WhoStep
        draft={draft}
        error={error?.field ? error : null}
        onName={(name) => { onFieldEdit(); setDraft((d) => ({ ...d, name })); }}
        onEmail={(email) => { onFieldEdit(); setDraft((d) => ({ ...d, email })); }}
      />
    ),
  };
  const name = cleanName(draft.name) || "your student";
  const last: ModalStep = {
    title: `Add ${name}`,
    hint: busy ? "Adding your student…" : undefined,
    canNext: !busy,
    body: (
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
        <p>When you press {ADD_FINISH}, attunr makes {name}&apos;s account and a plan for their first week, then emails {cleanEmail(draft.email)} a link to log in.</p>
        <p>{name} doesn&apos;t answer these questions again: the link opens their plan.</p>
        {error && !error.field && <Notice tone="warn" icon={<Icon name="alert-triangle" size={14} />}>{error.text}</Notice>}
      </div>
    ),
  };
  return [who, ...questionSteps(draft.answers, set, { forStudent: true }), last];
}

/**
 * Adding a student, as one step modal. It closes only with its Close button, or after the route has added the student
 * (`onAdded`). A failed try keeps everything typed: a name or email error goes back to the first screen with its line
 * under the field; any other error shows on the last screen. The flow survives a reload (`ADD_KEY`).
 */
export default function AddStudent({ onAdded, onClose }: { onAdded: (added: AddedStudent) => void; onClose: () => void }) {
  const [saved] = useState(() => savedAdd());
  const [draft, setDraftState] = useState<AddDraft>(saved?.draft ?? emptyDraft);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [error, setError] = useState<AddError | null>(null);
  const [busy, setBusy] = useState(false);
  const setDraft = (change: (d: AddDraft) => AddDraft) => setDraftState(change);

  const steps = addSteps(draft, setDraft, error, busy, () => setError((e) => (e?.field ? null : e)));
  const at = Math.min(step, steps.length - 1);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(ADD_KEY, JSON.stringify({ draft, step: at } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [draft, at]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await postStudent({ name: cleanName(draft.name), email: cleanEmail(draft.email), answers: draft.answers, today: localDate() });
    setBusy(false);
    if (r.ok) {
      clearAdd();
      onAdded(r);
      return;
    }
    const placed = placeError(r.code, r.error);
    setError(placed);
    if (placed.field) setStep(0);
  };

  return (
    <StepModal
      title="Add a student"
      steps={steps}
      finishLabel={busy ? "Adding…" : ADD_FINISH}
      step={at}
      bodyHeight="h-[34rem] max-h-[60vh]"
      large
      onStep={setStep}
      onClose={() => {
        clearAdd();
        onClose();
      }}
      onFinish={() => void submit()}
    />
  );
}
