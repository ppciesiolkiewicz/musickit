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
 * Only the Close button closes it (not Escape or a click beside it), so coming back from another window never loses the flow.
 * Pass `step`/`onStep` to own the screen number (to restore it after a reload).
 * `bodyHeight` (a height class, e.g. "h-[22rem]") gives every screen that same height, scrolling inside, so Back and Next never move.
 */
export function StepModal({ title, steps, onFinish, onClose, finishLabel = "Done", step: stepProp, onStep, bodyHeight }: {
  title: string; steps: ModalStep[]; onFinish: () => void; onClose: () => void; finishLabel?: string; step?: number; onStep?: (i: number) => void; bodyHeight?: string;
}) {
  const [own, setOwn] = useState(0);
  const i = Math.min(stepProp ?? own, steps.length - 1);
  const setI = (n: number) => (onStep ? onStep(n) : setOwn(n));
  const step = steps[i];
  const last = i >= steps.length - 1;
  return (
    <Modal title={title} narrow dismissible={false} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
          {steps.map((_, n) => <span key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= i ? "bg-sky-400" : "bg-slate-800"}`} />)}
        </div>
        <div>
          <p className="text-xs tabular-nums text-slate-500">{i + 1} / {steps.length}</p>
          <h3 className={`text-lg text-slate-100 ${bodyHeight ? "truncate" : ""}`}>{step.title}</h3>
          {(step.hint || bodyHeight) && <p className={`text-xs text-slate-500 ${bodyHeight ? "line-clamp-2 h-10" : ""}`}>{step.hint}</p>}
        </div>
        {/* keyed so autoFocus and local state start fresh on each screen */}
        <div key={i} className={bodyHeight ? `${bodyHeight} overflow-y-auto pr-3` : "min-h-24"}>{step.body}</div>
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
