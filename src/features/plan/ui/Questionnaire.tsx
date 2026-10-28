"use client";

import { Chip, hueAt } from "@/components/ui";
import { GOALS, INSTRUMENTS, LEVELS, MINUTES, STRUGGLES } from "../model/questions";
import type { PlanAnswers } from "../model/types";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

function Q({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm text-slate-200">
        {label}
        {hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** The in-app questionnaire: where the player wants to go and what they find hard, so the prompt can balance both. */
export default function Questionnaire({ value, onChange }: { value: PlanAnswers; onChange: (a: PlanAnswers) => void }) {
  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Q label="What do you play?">
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMENTS.map((x) => <Chip key={x.id} on={value.instrument === x.id} onClick={() => set("instrument", x.id)}>{x.label}</Chip>)}
        </div>
      </Q>
      <Q label="Your level">
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((x) => <Chip key={x.id} on={value.level === x.id} title={x.desc} onClick={() => set("level", x.id)}>{x.label}</Chip>)}
        </div>
      </Q>
      <Q label="Where do you want to go?" hint="pick any">
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((x, i) => <Chip key={x.id} hue={hueAt(i)} on={value.goals.includes(x.id)} onClick={() => set("goals", toggle(value.goals, x.id))}>{x.label}</Chip>)}
        </div>
      </Q>
      <Q label="What feels hard?" hint="the plan works on these too">
        <div className="flex flex-wrap gap-1.5">
          {STRUGGLES.map((x) => <Chip key={x.id} on={value.struggles.includes(x.id)} onClick={() => set("struggles", toggle(value.struggles, x.id))}>{x.label}</Chip>)}
        </div>
      </Q>
      <Q label="Minutes a day">
        <div className="flex flex-wrap gap-1.5">
          {MINUTES.map((m) => <Chip key={m} on={value.minutes === m} onClick={() => set("minutes", m)}>{m} min</Chip>)}
        </div>
      </Q>
      <Q label="Styles you love">
        <input className={field} value={value.styles} onChange={(e) => set("styles", e.target.value)} placeholder="blues, indie, bossa nova…" />
      </Q>
      <div className="md:col-span-2">
        <Q label="Anything else?" hint="optional">
          <textarea className={`${field} min-h-16`} value={value.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A song you want to learn, an injury, a gig in a month…" />
        </Q>
      </div>
    </div>
  );
}
