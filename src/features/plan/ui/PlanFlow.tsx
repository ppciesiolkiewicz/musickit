"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { StepModal, type ModalStep } from "@/components/ui";
import { areasMissingTopics, migrateAnswers } from "../intake/answers";
import type { PlanAnswers, PlanReview, StoredPlan } from "../model/types";
import type { Stars } from "@/features/progress/stars";
import { localDate, weekOver } from "../model/schedule";
import PlanReviewStep from "./PlanReviewStep";
import { areasStep, questionSteps, restSteps, topicSteps } from "../intake/ui/Questionnaire";

/** The flow in progress, kept for the tab's life so a reload or a hot reload reopens it where it was. */
export const FLOW_KEY = "musickit.plan.flow";
type Saved = { mode: "start" | "next"; draft: PlanAnswers; feedback: string; step: number; /** "next": the questionnaire screens were asked for */ editing?: boolean; /** "next": the plan review screen comes first */ reviewing?: boolean };

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

/** The finish button, named in the closing step's words. */
const FINISH = "Save my answers";
/** The "next" flow's button on the plan page and its title here: one name for one thing. */
export const REVIEW = "Review this week";

/**
 * The questions for a plan, as one step modal. "start": the whole questionnaire. "next": how the plan went (once the week is
 * over), how the week went, minutes and anything else. The topic screens are left out of "next" (ratings say more than
 * they do), except for an area with no answer yet (answers kept from before the topics), and unless the player asks with
 * "Change my answers". No plan is made here: "start"'s last screen says attunr puts today's plan together from the answers
 * (the page does, `useTodayPlan`, once `onAnswers` has stored them), or, opened with today's plan there (`current`, the
 * page's Change my answers), that the plan stays and Get another plan makes one from the new answers; "next" (a seven-day plan's week, not opened on `/plan`)
 * says next week's plan isn't ready and points to the demo plans. Finishing hands `onAnswers` the answers, for "next" the
 * notes on the week, and `asked`: whether the topic screens were shown (the answers are then remembered with their date).
 * Once the week is over, "next" opens on the plan review (`PlanReviewStep`, optional), which goes to `onReview` straight away.
 */
export default function PlanFlow({ mode, answers, current, review, onReview, onAnswers, onClose }: {
  mode: "start" | "next";
  answers: PlanAnswers;
  current: StoredPlan | null;
  review: PlanReview | null;
  onReview: (r: { stars: Stars; why?: string } | null) => void;
  onAnswers: (answers: PlanAnswers, feedback: string | undefined, asked: boolean) => void;
  onClose: () => void;
}) {
  // resume a saved flow of the same kind, otherwise start from the stored answers
  const [saved] = useState(() => {
    const s = savedFlow();
    return s?.mode === mode ? s : null;
  });
  const [draft, setDraft] = useState(saved?.draft ?? answers);
  const [feedback, setFeedback] = useState(saved?.feedback ?? current?.feedback ?? "");
  const [step, setStep] = useState(saved?.step ?? 0);
  const [editing, setEditing] = useState(saved?.editing ?? false);
  // from the stored answers, not the draft: the screen stays while the player answers it
  const [unanswered] = useState(() => areasMissingTopics(answers));
  // decided once (and kept with the saved flow), so the screens and the saved step number stay the same past midnight
  const [reviewing] = useState(() => saved?.reviewing ?? (mode === "next" && !!current && weekOver(current, localDate())));
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const steps: ModalStep[] = mode === "start"
    ? questionSteps(draft, set)
    : [
        ...(reviewing ? [{
          title: "How was this plan?",
          hint: "Optional. The team who pick plans read these stars. They are saved with this plan.",
          body: <PlanReviewStep review={review} onReview={onReview} />,
        }] : []),
        {
          title: "How did this week go?",
          hint: "What felt easy, hard, fun. attunr saves your notes with this plan.",
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
  steps.push(mode === "start" && current
    ? {
        // Change my answers with today's plan there: the plan stays
        title: "Your new answers",
        hint: "Today's plan stays as it is.",
        body: (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
            <p>When you press {FINISH}, attunr saves your new answers. Today&apos;s plan stays as it is.</p>
            <p>For a plan from your new answers, press Get another plan on the plan page. From tomorrow, each new plan starts from them.</p>
          </div>
        ),
      }
    : mode === "start"
    ? {
        title: "Your first plan",
        hint: "attunr makes today's plan from your answers.",
        body: (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
            <p>When you press {FINISH}, attunr saves your answers and puts today&apos;s plan together.</p>
            <p>Each day you open the plan page, attunr makes a new plan. The stars you give each exercise shape the next one.</p>
          </div>
        ),
      }
    : {
        title: "Next week's plan isn't ready yet",
        hint: "attunr can't put next week's plan together for you yet.",
        body: <NotReady>When you press {FINISH}, attunr saves your notes with this plan, and your plan stays as it is.</NotReady>,
      });
  // a flow saved with more screens (the two prompt steps it had before) opens on the last one
  const at = Math.min(step, steps.length - 1);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(FLOW_KEY, JSON.stringify({ mode, draft, feedback, step: at, editing, reviewing } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [mode, draft, feedback, at, editing, reviewing]);

  return (
    <StepModal
      title={mode === "start" ? "Your practice plan" : REVIEW}
      steps={steps}
      finishLabel={FINISH}
      step={at}
      bodyHeight="h-[34rem] max-h-[60vh]"
      large
      onStep={setStep}
      onClose={() => {
        clearFlow();
        onClose();
      }}
      onFinish={() => {
        clearFlow();
        onAnswers(draft, mode === "next" ? feedback : undefined, mode === "start" || editing || unanswered.length > 0);
      }}
    />
  );
}

/** "next"'s closing screen: why no plan comes yet, and the demo plans to open meanwhile. */
function NotReady({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
      <p>{children}</p>
      <p>
        Until then, the six demo plans show what a week of practice looks like.{" "}
        <Link href="/demo" className="text-sky-300 underline underline-offset-2 hover:text-sky-200">Open the demo plans</Link>
      </p>
    </div>
  );
}
