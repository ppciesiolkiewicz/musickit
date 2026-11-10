"use client";

import { useEffect, useMemo, useState } from "react";
import { StepModal, type ModalStep } from "@/components/ui";
import type { CatalogueEntry } from "../model/catalogue";
import { areasMissingTopics, migrateAnswers } from "../intake/answers";
import { parsePlanConfig } from "../model/config";
import { buildPrompt } from "../model/prompt";
import { useAllNotes } from "@/components/course/useCourseNotes";
import { courseRatings } from "@/features/course/ratings";
import type { PlanAnswers, PlanConfig, StoredPlan } from "../model/types";
import { CopyPrompt, PasteBox } from "./PromptAndPaste";
import { agentReply } from "../model/fixRequest";
import { hasBrowserAgentApi, useBrowserAgentTools } from "./useBrowserAgentTools";
import { areasStep, questionSteps, restSteps, topicSteps } from "../intake/ui/Questionnaire";

/** The flow in progress, kept for the tab's life so a reload or a hot reload reopens it where it was. */
export const FLOW_KEY = "musickit.plan.flow";
type Saved = { mode: "start" | "next"; draft: PlanAnswers; feedback: string; text: string; step: number; /** "next": the questionnaire screens were asked for */ editing?: boolean };

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

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

/**
 * Making a plan, as one step modal. "start": the whole questionnaire, then copy the prompt (no past weeks: a fresh start), then paste.
 * "next": how the week went, minutes and anything else, then the prompt with this week's ratings by topic and the AI's
 * progress summary, then paste. The topic screens are left out of "next" (ratings say more than they do), except for an
 * area with no answer yet (answers kept from before the topics), and unless the player asks with "Change my answers". `onPlan` gets the plan, the answers and, for "next", the notes on the week.
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
  const [editing, setEditing] = useState(saved?.editing ?? false);
  // from the stored answers, not the draft: the screen stays while the player answers it
  const [unanswered] = useState(() => areasMissingTopics(answers));
  useEffect(() => {
    try {
      window.sessionStorage.setItem(FLOW_KEY, JSON.stringify({ mode, draft, feedback, text, step, editing } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [mode, draft, feedback, text, step, editing]);
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const parsed = useMemo(() => (text.trim() ? parsePlanConfig(text, entries) : null), [text, entries]);

  const notes = useAllNotes();
  const course = useMemo(() => courseRatings(notes), [notes]);
  const past = mode === "next" && current ? [{ ...current, feedback }, ...history] : [];
  const prompt = buildPrompt(draft, entries, past, course);
  const [agentTools] = useState(hasBrowserAgentApi);
  // the browser's AI (WebMCP) reads the prompt and sends its plan: it lands in the paste box, on the paste step
  useBrowserAgentTools(prompt, (reply) => {
    setText(reply);
    setStep(steps.length - 1);
    return agentReply(parsePlanConfig(reply, entries));
  });

  const steps: ModalStep[] = mode === "start"
    ? questionSteps(draft, set)
    : [
        {
          title: "How did this week go?",
          hint: "What felt easy, hard, fun. It goes into the prompt with the stars you gave each exercise.",
          body: (
            <div className="flex h-full flex-col gap-2">
              <textarea autoFocus className={`${field} min-h-0 flex-1`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Day 3 was too fast, loved the improv, want more songs…" />
              <button
                type="button"
                aria-pressed={editing}
                onClick={() => setEditing((v) => !v)}
                className="min-h-11 w-fit cursor-pointer text-left text-sm text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                {editing ? "Keep my answers as they are" : "Change my answers (what you play, and where you are in each topic)"}
              </button>
            </div>
          ),
        },
        ...(editing ? [areasStep(draft, set), ...topicSteps(draft, set)] : topicSteps(draft, set, unanswered)),
        ...restSteps(draft, set, editing),
      ];
  steps.push(
    {
      title: mode === "start" ? "Copy your prompt" : "Copy next week's prompt",
      hint: mode === "start"
        ? "Your answers, turned into a prompt for an AI. Copy it into ChatGPT, Claude, Gemini…, then paste the reply on the next step."
        : "It carries this week's stars, your notes and your AI's notes on your progress. Copy it into your AI, then paste the reply on the next step.",
      body: <CopyPrompt prompt={prompt} agentTools={agentTools} />,
    },
    {
      title: "Paste your AI's reply",
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
      bodyHeight="h-[22rem]"
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
