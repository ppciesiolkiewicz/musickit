"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button } from "../../atoms/Button";
import { Modal } from "../Modal";

/** One screen of a step modal. `canNext` false holds the player on it (a required answer). */
export interface ModalStep {
  title: ReactNode;
  hint?: ReactNode;
  body: ReactNode;
  canNext?: boolean;
}

/**
 * A modal that walks through `steps` one screen at a time: a progress bar, Back and Next, and `finishLabel` on the last
 * screen, which calls `onFinish`. Callers keep the answers themselves (the bodies are their own controls); closing just calls `onClose`.
 */
export function StepModal({ title, steps, onFinish, onClose, finishLabel = "Done" }: {
  title: string; steps: ModalStep[]; onFinish: () => void; onClose: () => void; finishLabel?: string;
}) {
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  return (
    <Modal title={title} narrow onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
          {steps.map((_, n) => <span key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= i ? "bg-sky-400" : "bg-slate-800"}`} />)}
        </div>
        <div>
          <p className="text-xs tabular-nums text-slate-500">{i + 1} / {steps.length}</p>
          <h3 className="text-lg text-slate-100">{step.title}</h3>
          {step.hint && <p className="text-xs text-slate-500">{step.hint}</p>}
        </div>
        {/* keyed so autoFocus and local state start fresh on each screen */}
        <div key={i} className="min-h-24">{step.body}</div>
        <div className="flex items-center gap-2">
          {i > 0 && <Button onClick={() => setI(i - 1)}><Icon name="chevron-left" size={12} />Back</Button>}
          <Button
            className="ml-auto !border-sky-500/70 !bg-sky-500/20 !text-sky-100"
            disabled={step.canNext === false}
            onClick={() => (last ? onFinish() : setI(i + 1))}
          >
            {last ? finishLabel : "Next"}
            <Icon name={last ? "check" : "chevron-right"} size={12} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
