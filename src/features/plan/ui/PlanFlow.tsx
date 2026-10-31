"use client";

import { useEffect, useMemo, useState } from "react";
import { StepModal, type ModalStep } from "@/components/ui";
import type { CatalogueEntry } from "../model/catalogue";
import { migrateAnswers } from "../model/answers";
import { parsePlanConfig } from "../model/config";
import { buildPrompt } from "../model/prompt";
import type { PlanAnswers, PlanConfig, StoredPlan } from "../model/types";
import { CopyPrompt, PasteBox } from "./PromptAndPaste";
import { questionSteps } from "./Questionnaire";

/** The flow in progress, kept for the tab's life so a reload or a hot reload reopens it where it was. */
export const FLOW_KEY = "musickit.plan.flow";
type Saved = { mode: "start" | "next"; draft: PlanAnswers; feedback: string; text: string; step: number };

/** The saved flow, if any (sessionStorage can be blocked). */
export function savedFlow(): Saved | null {
  try {
    const s = JSON.parse(window.sessionStorage.getItem(FLOW_KEY) ?? "null") as Saved | null;
    return s && (s.mode === "start" || s.mode === "next") && s.draft ? { ...s, draft: migrateAnswers(s.draft) } : null;
  } catch {
    return null;
  }
}

export function clearFlow(): void {
  try {
    window.sessionStorage.removeItem(FLOW_KEY);
  } catch {
    /* ignore */
  }
}

const field = "min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

/**
 * Making a plan, as one step modal. "start": every question, then copy the prompt (no past weeks: a fresh start), then paste.
 * "next": how the week went and whether the direction changed, then the prompt with this week's exercises (done or skipped),
 * the notes and earlier weeks, then paste. `onPlan` gets the plan, the answers and, for "next", the notes on the week.
 */
export default function PlanFlow({ mode, answers, current, history, entries, onPlan, onClose }: {
  mode: "start" | "next";
  answers: PlanAnswers;
  current: StoredPlan | null;
  history: StoredPlan[];
  entries: CatalogueEntry[];
  onPlan: (config: PlanConfig, answers: PlanAnswers, feedback?: string) => void;
  onClose: () => void;
}) {
  // resume a saved flow of the same kind, otherwise start from the stored answers
  const [saved] = useState(() => {
    const s = savedFlow();
    return s?.mode === mode ? s : null;
  });
  const [draft, setDraft] = useState(saved?.draft ?? answers);
  const [feedback, setFeedback] = useState(saved?.feedback ?? current?.feedback ?? "");
  const [text, setText] = useState(saved?.text ?? "");
  const [step, setStep] = useState(saved?.step ?? 0);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(FLOW_KEY, JSON.stringify({ mode, draft, feedback, text, step } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [mode, draft, feedback, text, step]);
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const parsed = useMemo(() => (text.trim() ? parsePlanConfig(text, entries) : null), [text, entries]);

  const past = mode === "next" && current ? [{ ...current, feedback }, ...history] : [];
  const prompt = buildPrompt(draft, entries, past);

  const steps: ModalStep[] = mode === "start"
    ? questionSteps(draft, set)
    : [
        {
          title: "How did this week go?",
          hint: "What felt easy, hard, fun. It goes into the prompt with what you ticked off.",
          body: <textarea autoFocus className={field} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Day 3 was too fast, loved the improv, want more songs…" />,
        },
        ...questionSteps(draft, set, ["minutes"]).map((s, i) => (i === 0 ? { ...s, title: "How long can you practise now?" } : s)),
      ];
  steps.push(
    {
      title: mode === "start" ? "Copy your prompt" : "Copy next week's prompt",
      hint: mode === "start" ? "Paste it into ChatGPT, Claude, Gemini… Nothing leaves this browser." : "It carries this week's exercises, what you did and skipped, and your notes.",
      body: <CopyPrompt prompt={prompt} entries={entries} />,
    },
    {
      title: "Paste its reply",
      hint: "The whole reply is fine; we find the plan in it.",
      body: <PasteBox text={text} onText={setText} result={parsed} />,
      canNext: !!parsed?.ok,
    },
  );

  return (
    <StepModal
      title={mode === "start" ? "Your practice plan" : "Next week"}
      steps={steps}
      finishLabel="Build my plan"
      step={step}
      onStep={setStep}
      onClose={() => {
        clearFlow();
        onClose();
      }}
      onFinish={() => {
        if (!parsed?.ok) return;
        clearFlow();
        onPlan(parsed.config, draft, mode === "next" ? feedback : undefined);
      }}
    />
  );
}
