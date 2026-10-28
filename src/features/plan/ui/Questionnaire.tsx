"use client";

import type { ReactNode } from "react";
import { Chip, hueAt, type ModalStep } from "@/components/ui";
import { GOALS, INSTRUMENTS, LEVELS, MINUTES, STRUGGLES } from "../model/questions";
import type { Instrument, PlanAnswers } from "../model/types";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;
export type QuestionId = "instruments" | "level" | "goals" | "struggles" | "minutes" | "styles" | "notes";

interface Question {
  id: QuestionId;
  title: string;
  hint?: string;
  /** false holds the player on this question */
  need?: (a: PlanAnswers) => boolean;
  body: (a: PlanAnswers, set: SetAnswer) => ReactNode;
}

/** One question per screen: where the player wants to go and what they find hard, so the prompt can balance both. */
const QUESTIONS: Question[] = [
  {
    id: "instruments",
    title: "What do you play?",
    hint: "Pick any",
    need: (a) => a.instruments.length > 0,
    body: (a, set) => <div className="flex flex-wrap gap-2">{INSTRUMENTS.map((x) => <Chip key={x.id} on={a.instruments.includes(x.id)} onClick={() => set("instruments", toggle(a.instruments, x.id) as Instrument[])}>{x.label}</Chip>)}</div>,
  },
  {
    id: "level",
    title: "Where are you now?",
    body: (a, set) => (
      <div className="grid gap-2 sm:grid-cols-2">
        {LEVELS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={a.level === x.id} onClick={() => set("level", x.id)}
            className={`rounded-xl border p-3 text-left transition ${a.level === x.id ? "border-sky-500/70 bg-sky-500/15" : "border-slate-700 hover:border-slate-500"}`}>
            <span className="block text-sm text-slate-100">{x.label}</span>
            <span className="block text-xs text-slate-500">{x.desc}</span>
          </button>
        ))}
      </div>
    ),
  },
  {
    id: "goals",
    title: "Where do you want to go?",
    hint: "Pick any",
    body: (a, set) => <div className="flex flex-wrap gap-2">{GOALS.map((x, i) => <Chip key={x.id} hue={hueAt(i)} on={a.goals.includes(x.id)} onClick={() => set("goals", toggle(a.goals, x.id))}>{x.label}</Chip>)}</div>,
  },
  {
    id: "struggles",
    title: "What feels hard?",
    hint: "The plan works on these too, even if your goals don't ask",
    body: (a, set) => <div className="flex flex-wrap gap-2">{STRUGGLES.map((x) => <Chip key={x.id} on={a.struggles.includes(x.id)} onClick={() => set("struggles", toggle(a.struggles, x.id))}>{x.label}</Chip>)}</div>,
  },
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

/** The questions as step-modal screens over `draft`; `ids` picks some (the follow-up asks only goals and minutes). */
export function questionSteps(draft: PlanAnswers, set: SetAnswer, ids?: QuestionId[]): ModalStep[] {
  return QUESTIONS.filter((q) => !ids || ids.includes(q.id)).map((q) => ({ title: q.title, hint: q.hint, body: q.body(draft, set), canNext: q.need?.(draft) ?? true }));
}
