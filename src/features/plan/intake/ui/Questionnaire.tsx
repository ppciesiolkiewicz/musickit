"use client";

import { Chip, type ModalStep } from "@/components/ui";
import { VOICES, type Voice } from "@/features/theory/singing";
import { AREAS, type Area } from "../../model/concepts";
import { MINUTES, type PlanAnswers } from "../answers";
import { topicsFor } from "../topics";
import RangeFinder from "./RangeFinder";
import TopicStep from "./TopicStep";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;

/** Which areas the player practises; at least one. Answers of an area that is switched off stay, in case it comes back. */
export function areasStep(a: PlanAnswers, set: SetAnswer): ModalStep {
  const toggle = (area: Area) => {
    const picked = a.areas.includes(area) ? a.areas.filter((x) => x !== area) : [...a.areas, area];
    set("areas", AREAS.map((x) => x.id).filter((id) => picked.includes(id)));
  };
  return {
    title: "What do you play?",
    hint: "Pick everything you want in your plan. At least one.",
    canNext: a.areas.length > 0,
    body: (
      <div className="flex flex-wrap gap-2">
        {AREAS.map((ar) => <Chip key={ar.id} on={a.areas.includes(ar.id)} onClick={() => toggle(ar.id)}>{ar.label}</Chip>)}
      </div>
    ),
  };
}

/** One screen per area (the chosen ones unless `areas` says which): its topics, each answered by picking a line. */
export function topicSteps(a: PlanAnswers, set: SetAnswer, areas: Area[] = a.areas): ModalStep[] {
  return AREAS.filter((ar) => areas.includes(ar.id)).map((ar) => {
    const list = topicsFor(ar.id);
    const answered = list.filter((t) => a.topics[t.id] !== undefined).length;
    return {
      title: `${ar.label}: where are you now?`,
      hint: `For each topic, pick the line that sounds most like you. ${answered} of ${list.length} answered.`,
      body: <TopicStep key={ar.id} area={ar.id} topics={a.topics} onTopics={(t) => set("topics", t)} />,
    };
  });
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
          <Chip on={!type} onClick={() => set("voice", undefined)}>Not sure</Chip>
        </div>
        {type && a.voice?.range && <p className="text-xs text-slate-400">Range found. It is kept with your answers.</p>}
        <RangeFinder onRange={(range, v) => set("voice", { type: v, range })} />
      </div>
    ),
  };
}

/** The screens after the topics: voice (when Voice is chosen and `voice` isn't false), minutes a day, anything else. */
export function restSteps(a: PlanAnswers, set: SetAnswer, voice = true): ModalStep[] {
  return [
    ...(voice && a.areas.includes("voice") ? [voiceStep(a, set)] : []),
    {
      title: "How long can you practise a day?",
      body: <div className="flex flex-wrap gap-2">{MINUTES.map((m) => <Chip key={m} on={a.minutes === m} onClick={() => set("minutes", m)}>{m} min</Chip>)}</div>,
    },
    {
      title: "Anything else?",
      hint: "Optional",
      body: (
        <div className="flex flex-col gap-3">
          <textarea className={`${field} min-h-24`} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder="A song you want to learn, an injury, a gig in a month…" />
          <label className="text-xs text-slate-500">
            Styles you like
            <input className={`${field} mt-1`} value={a.styles} onChange={(e) => set("styles", e.target.value)} placeholder="Optional: only flavours the drills (blues, folk…)" />
          </label>
        </div>
      ),
    },
  ];
}

/**
 * The whole first questionnaire as step-modal screens over `draft`: what you play, one topic screen per chosen area,
 * voice (if Voice is chosen), minutes, anything else. The screen count follows the answers.
 */
export function questionSteps(draft: PlanAnswers, set: SetAnswer): ModalStep[] {
  return [areasStep(draft, set), ...topicSteps(draft, set), ...restSteps(draft, set)];
}
