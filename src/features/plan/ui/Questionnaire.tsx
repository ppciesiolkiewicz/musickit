"use client";

import type { ReactNode } from "react";
import { Chip, type ModalStep } from "@/components/ui";
import { MINUTES } from "../model/questions";
import type { PlanAnswers } from "../model/types";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;
export type QuestionId = "minutes" | "styles" | "notes";

interface Question {
  id: QuestionId;
  title: string;
  hint?: string;
  /** false holds the player on this question */
  need?: (a: PlanAnswers) => boolean;
  body: (a: PlanAnswers, set: SetAnswer) => ReactNode;
}

/** One question per screen. Placeholder until the per-area levels and concept ratings screens replace it. */
const QUESTIONS: Question[] = [
  {
    id: "minutes",
    title: "How long can you practise a day?",
    body: (a, set) => <div className="flex flex-wrap gap-2">{MINUTES.map((m) => <Chip key={m} on={a.minutes === m} onClick={() => set("minutes", m)}>{m} min</Chip>)}</div>,
  },
  {
    id: "styles",
    title: "Styles you love",
    hint: "Optional",
    body: (a, set) => <input autoFocus className={field} value={a.styles} onChange={(e) => set("styles", e.target.value)} placeholder="blues, indie, bossa nova…" />,
  },
  {
    id: "notes",
    title: "Anything else?",
    hint: "Optional",
    body: (a, set) => <textarea autoFocus className={`${field} min-h-24`} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A song you want to learn, an injury, a gig in a month…" />,
  },
];

/** The questions as step-modal screens over `draft`; `ids` picks some (the follow-up asks only minutes). */
export function questionSteps(draft: PlanAnswers, set: SetAnswer, ids?: QuestionId[]): ModalStep[] {
  return QUESTIONS.filter((q) => !ids || ids.includes(q.id)).map((q) => ({ title: q.title, hint: q.hint, body: q.body(draft, set), canNext: q.need?.(draft) ?? true }));
}
