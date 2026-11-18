"use client";

import { useEffect, useState } from "react";
import { StepModal, type ModalStep } from "@/components/ui";
import { migrateAnswers } from "../intake/answers";
import type { PlanAnswers, StoredPlan } from "../model/types";
import { questionSteps } from "../intake/ui/Questionnaire";

/** The flow in progress, kept for the tab's life so a reload or a hot reload reopens it where it was. */
export const FLOW_KEY = "musickit.plan.flow";
type Saved = { mode: "start"; draft: PlanAnswers; step: number };

/** The saved flow, if any (sessionStorage can be blocked). A flow saved by the week's review ("next", gone) is not one. */
export function savedFlow(): Saved | null {
  try {
    const s = JSON.parse(window.sessionStorage.getItem(FLOW_KEY) ?? "null") as Saved | null;
    return s && s.mode === "start" && s.draft ? { ...s, draft: migrateAnswers(s.draft) } : null;
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

/** The finish button, named in the closing step's words. */
const FINISH = "Save my answers";

/**
 * The questionnaire for a plan, as one step modal. No plan is made here: the last screen says attunr puts today's plan
 * together from the answers (the page does, `useTodayPlan`, once `onAnswers` has stored them), or, opened with today's
 * plan there (`current`, the page's Change my answers), that the plan stays and Get another plan makes one from the new
 * answers. Finishing hands `onAnswers` the answers.
 */
export default function PlanFlow({ answers, current, onAnswers, onClose }: {
  answers: PlanAnswers;
  current: StoredPlan | null;
  onAnswers: (answers: PlanAnswers) => void;
  onClose: () => void;
}) {
  // resume a saved flow, otherwise start from the stored answers
  const [saved] = useState(() => savedFlow());
  const [draft, setDraft] = useState(saved?.draft ?? answers);
  const [step, setStep] = useState(saved?.step ?? 0);
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const steps: ModalStep[] = questionSteps(draft, set);
  steps.push(current
    ? {
        // Change my answers with today's plan there: the plan stays
        title: "Your new answers",
        hint: "Today's plan stays as it is.",
        body: (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
            <p>When you press {FINISH}, attunr saves your new answers. Today&apos;s plan stays as it is.</p>
            <p>For a plan from your new answers, press Get another plan. From tomorrow, each new plan starts from them.</p>
          </div>
        ),
      }
    : {
        title: "Your first plan",
        hint: "attunr makes today's plan from your answers.",
        body: (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-300">
            <p>When you press {FINISH}, attunr saves your answers and puts today&apos;s plan together.</p>
            <p>Each day you open the Practice plan page, attunr makes a new plan. The stars you give each exercise shape the next one.</p>
          </div>
        ),
      });
  // a flow saved with more screens (the two prompt steps it had before) opens on the last one
  const at = Math.min(step, steps.length - 1);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(FLOW_KEY, JSON.stringify({ mode: "start", draft, step: at } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, [draft, at]);

  return (
    <StepModal
      title="Your practice plan"
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
        onAnswers(draft);
      }}
    />
  );
}
