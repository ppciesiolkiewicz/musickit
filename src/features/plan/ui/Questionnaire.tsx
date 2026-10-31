"use client";

import { Chip, type ModalStep } from "@/components/ui";
import { VOICES, type Voice } from "@/features/theory/singing";
import { AREAS, CONCEPTS, conceptById, conceptsFor, type Area, type Concept } from "../model/concepts";
import { LEVELS, MINUTES } from "../model/questions";
import type { Level, PlanAnswers, Rating } from "../model/types";
import RangeFinder from "./RangeFinder";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;

const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];
const MAX_FOCUS = 3;

/** The areas the player did not skip, in screen order. */
const activeAreas = (a: PlanAnswers) => AREAS.filter((x) => a.levels[x.id]);

/** Concepts offered as this week's focus: rated 1–2 among those shown, plus the first two of each area's next level. */
function focusOptions(a: PlanAnswers): Concept[] {
  const out: Concept[] = [];
  for (const { id } of activeAreas(a)) {
    const level = a.levels[id]!;
    const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1];
    out.push(...conceptsFor(id, level).filter((c) => (a.ratings[c.id] ?? 6) <= 2));
    if (next) out.push(...CONCEPTS.filter((c) => c.area === id && c.level === next).slice(0, 2));
  }
  return out;
}

function levelsStep(a: PlanAnswers, set: SetAnswer): ModalStep {
  const choose = (area: Area, level: Level | undefined) => {
    const levels = { ...a.levels };
    if (level) levels[area] = level;
    else delete levels[area];
    set("levels", levels);
    // a skipped area can't be a focus; its ratings stay in case it comes back
    if (!level) set("focus", a.focus.filter((id) => conceptById(id)?.area !== area));
  };
  return {
    title: "Where are you now?",
    hint: "Pick a level for each area, or skip it. At least one.",
    canNext: activeAreas(a).length > 0,
    body: (
      <div className="flex flex-col gap-4">
        {AREAS.map((ar) => (
          <div key={ar.id}>
            <p className="mb-1 text-sm text-slate-200">{ar.label}</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!a.levels[ar.id]} onClick={() => choose(ar.id, undefined)}>Skip</Chip>
              {LEVELS.map((l) => <Chip key={l.id} on={a.levels[ar.id] === l.id} onClick={() => choose(ar.id, l.id)} title={l.desc}>{l.label}</Chip>)}
            </div>
          </div>
        ))}
      </div>
    ),
  };
}

function Stars({ concept, value, onChange }: { concept: Concept; value?: Rating; onChange: (r?: Rating) => void }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {([1, 2, 3, 4, 5] as Rating[]).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${concept.label}: ${n} of 5`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? undefined : n)}
          className={`h-7 w-7 rounded text-lg leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${value !== undefined && n <= value ? "text-amber-300" : "text-slate-700 hover:text-slate-500"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function conceptStep(a: PlanAnswers, set: SetAnswer, area: { id: Area; label: string }): ModalStep {
  const rate = (id: string, r?: Rating) => {
    const ratings = { ...a.ratings };
    if (r) ratings[id] = r;
    else delete ratings[id];
    set("ratings", ratings);
  };
  return {
    title: `${area.label}: how comfortable are you?`,
    hint: "1 to 5 stars. Leave blank if you're not sure.",
    body: (
      <ul className="flex flex-col gap-2">
        {conceptsFor(area.id, a.levels[area.id]!).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-slate-200">{c.label}</p>
              {c.hint && <p className="text-xs text-slate-500">{c.hint}</p>}
              {c.buildsOn && <p className="text-xs text-slate-600">builds on {c.buildsOn.map((id) => conceptById(id)?.label ?? id).join(", ")}</p>}
            </div>
            <Stars concept={c} value={a.ratings[c.id]} onChange={(r) => rate(c.id, r)} />
          </li>
        ))}
      </ul>
    ),
  };
}

function voiceStep(a: PlanAnswers, set: SetAnswer): ModalStep {
  const type = a.voice?.type;
  return {
    title: "Your voice",
    hint: "Optional. Pick a type, or find your range with the mic.",
    body: (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VOICES) as Voice[]).map((v) => <Chip key={v} on={type === v} onClick={() => set("voice", { ...a.voice, type: v })}>{VOICES[v].label}</Chip>)}
          <Chip on={!type} onClick={() => set("voice", { range: a.voice?.range })}>Not sure</Chip>
        </div>
        {a.voice?.range && <p className="text-xs text-slate-400">Range found. It is kept with your answers.</p>}
        <RangeFinder onRange={(range, v) => set("voice", { type: v, range })} />
      </div>
    ),
  };
}

function focusStep(a: PlanAnswers, set: SetAnswer): ModalStep {
  const options = focusOptions(a);
  const ids = new Set(options.map((c) => c.id));
  const shown = [...options, ...a.focus.filter((id) => !ids.has(id)).flatMap((id) => conceptById(id) ?? [])];
  const toggle = (id: string) => set("focus", a.focus.includes(id) ? a.focus.filter((x) => x !== id) : a.focus.length < MAX_FOCUS ? [...a.focus, id] : a.focus);
  return {
    title: "This week",
    hint: `Optional: up to ${MAX_FOCUS} things to focus on. Nothing picked and the AI decides.`,
    body: shown.length ? (
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => <Chip key={c.id} on={a.focus.includes(c.id)} onClick={() => toggle(c.id)}>{c.label}</Chip>)}
      </div>
    ) : <p className="text-sm text-slate-500">Nothing stands out yet. The AI will choose.</p>,
  };
}

/**
 * The questionnaire as step-modal screens over `draft`, in order: levels, one concept screen per non-skipped area,
 * voice (if Voice isn't skipped), this week, minutes, anything else. The screen count follows the answers.
 */
export function questionSteps(draft: PlanAnswers, set: SetAnswer): ModalStep[] {
  const areas = activeAreas(draft);
  return [
    levelsStep(draft, set),
    ...areas.map((ar) => conceptStep(draft, set, ar)),
    ...(draft.levels.voice ? [voiceStep(draft, set)] : []),
    focusStep(draft, set),
    {
      title: "How long can you practise a day?",
      body: <div className="flex flex-wrap gap-2">{MINUTES.map((m) => <Chip key={m} on={draft.minutes === m} onClick={() => set("minutes", m)}>{m} min</Chip>)}</div>,
    },
    {
      title: "Anything else?",
      hint: "Optional",
      body: (
        <div className="flex flex-col gap-3">
          <textarea className={`${field} min-h-24`} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A song you want to learn, an injury, a gig in a month…" />
          <label className="text-xs text-slate-500">
            Styles you like
            <input className={`${field} mt-1`} value={draft.styles} onChange={(e) => set("styles", e.target.value)} placeholder="Optional: only flavours the drills (blues, folk…)" />
          </label>
        </div>
      ),
    },
  ];
}
