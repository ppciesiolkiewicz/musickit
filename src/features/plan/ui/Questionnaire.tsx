"use client";

import { useState, type ReactNode } from "react";
import { Chip, StepModal, hueAt } from "@/components/ui";
import { GOALS, INSTRUMENTS, LEVELS, MINUTES, STRUGGLES, labelOf } from "../model/questions";
import type { Instrument, PlanAnswers } from "../model/types";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

interface Question {
  title: string;
  hint?: string;
  /** false holds the player on this question */
  need?: (a: PlanAnswers) => boolean;
  body: (a: PlanAnswers, set: <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void) => ReactNode;
}

/** One question per screen: where the player wants to go and what they find hard, so the prompt can balance both. */
const QUESTIONS: Question[] = [
  {
    title: "What do you play?",
    hint: "Pick any",
    need: (a) => a.instruments.length > 0,
    body: (a, set) => <div className="flex flex-wrap gap-2">{INSTRUMENTS.map((x) => <Chip key={x.id} on={a.instruments.includes(x.id)} onClick={() => set("instruments", toggle(a.instruments, x.id) as Instrument[])}>{x.label}</Chip>)}</div>,
  },
  {
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
    title: "Where do you want to go?",
    hint: "Pick any",
    body: (a, set) => <div className="flex flex-wrap gap-2">{GOALS.map((x, i) => <Chip key={x.id} hue={hueAt(i)} on={a.goals.includes(x.id)} onClick={() => set("goals", toggle(a.goals, x.id))}>{x.label}</Chip>)}</div>,
  },
  {
    title: "What feels hard?",
    hint: "The plan works on these too, even if your goals don't ask",
    body: (a, set) => <div className="flex flex-wrap gap-2">{STRUGGLES.map((x) => <Chip key={x.id} on={a.struggles.includes(x.id)} onClick={() => set("struggles", toggle(a.struggles, x.id))}>{x.label}</Chip>)}</div>,
  },
  {
    title: "How long can you practise a day?",
    body: (a, set) => <div className="flex flex-wrap gap-2">{MINUTES.map((m) => <Chip key={m} on={a.minutes === m} onClick={() => set("minutes", m)}>{m} min</Chip>)}</div>,
  },
  {
    title: "Styles you love",
    hint: "Optional",
    body: (a, set) => <input autoFocus className={field} value={a.styles} onChange={(e) => set("styles", e.target.value)} placeholder="blues, indie, bossa nova…" />,
  },
  {
    title: "Anything else?",
    hint: "Optional",
    body: (a, set) => <textarea autoFocus className={`${field} min-h-24`} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A song you want to learn, an injury, a gig in a month…" />,
  },
];

/** The questionnaire as a step modal, one question per screen; `onDone` gets the answers, closing keeps the old ones. */
export default function QuestionnaireModal({ initial, onDone, onClose }: { initial: PlanAnswers; onDone: (a: PlanAnswers) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const steps = QUESTIONS.map((q) => ({ title: q.title, hint: q.hint, body: q.body(draft, set), canNext: q.need?.(draft) ?? true }));
  return <StepModal title="About you" steps={steps} onFinish={() => onDone(draft)} onClose={onClose} />;
}

/** The answers in one line, for the page under the questionnaire. */
export function answersSummary(a: PlanAnswers): string {
  return [
    ...a.instruments.map((x) => labelOf(INSTRUMENTS, x)),
    labelOf(LEVELS, a.level),
    ...a.goals.map((g) => labelOf(GOALS, g)),
    `${a.minutes} min a day`,
  ].join(" · ");
}
