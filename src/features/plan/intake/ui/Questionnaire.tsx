"use client";

import Icon from "@/components/Icon";
import { Chip, Tile, hueAt, hueClass, type Hue, type ModalStep } from "@/components/ui";
import { VOICES, type Voice } from "@/features/theory/singing";
import { AREAS, type Area } from "../../model/concepts";
import { MINUTES, type PlanAnswers } from "../answers";
import { topicsFor } from "../topics";
import RangeFinder from "./RangeFinder";
import TopicStep from "./TopicStep";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none";

/** Each area keeps its colour and icon on every screen of the flow, so the player always sees which part they are in. */
export const AREA_LOOK: Record<Area, { hue: Hue; icon: "guitar" | "mic" | "ear" }> = {
  guitar: { hue: "amber", icon: "guitar" },
  voice: { hue: "rose", icon: "mic" },
  theory: { hue: "violet", icon: "ear" },
};

export type SetAnswer = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => void;

/**
 * How the screens are worded and what they ask. `forStudent`: a teacher fills them in for a student (the Students page):
 * "you" becomes "your student", the answer options keep their own words, the voice screen has no range finder (it
 * listens to the person at the microphone), and each topic screen needs one answer (an area with none can't make a plan).
 */
export interface QuestionOpts {
  forStudent?: boolean;
}

/** Which areas the player practises; at least one. Answers of an area that is switched off stay, in case it comes back. */
export function areasStep(a: PlanAnswers, set: SetAnswer, { forStudent = false }: QuestionOpts = {}): ModalStep {
  const toggle = (area: Area) => {
    const picked = a.areas.includes(area) ? a.areas.filter((x) => x !== area) : [...a.areas, area];
    set("areas", AREAS.map((x) => x.id).filter((id) => picked.includes(id)));
  };
  return {
    title: forStudent ? "What does your student play?" : "What do you play?",
    hint: forStudent ? "Pick everything your student wants in their plan. At least one." : "Pick everything you want in your plan. At least one.",
    canNext: a.areas.length > 0,
    body: (
      <div className="grid grid-cols-3 gap-3">
        {AREAS.map((ar) => (
          <Tile key={ar.id} hue={AREA_LOOK[ar.id].hue} on={a.areas.includes(ar.id)} onClick={() => toggle(ar.id)} icon={<Icon name={AREA_LOOK[ar.id].icon} size={20} />}>
            <span className="text-sm">{ar.label}</span>
          </Tile>
        ))}
      </div>
    ),
  };
}

/** One screen per area (the chosen ones unless `areas` says which): its topics, each answered by picking a line. */
export function topicSteps(a: PlanAnswers, set: SetAnswer, areas: Area[] = a.areas, { forStudent = false }: QuestionOpts = {}): ModalStep[] {
  return AREAS.filter((ar) => areas.includes(ar.id)).map((ar) => {
    const list = topicsFor(ar.id);
    const answered = list.filter((t) => a.topics[t.id] !== undefined).length;
    return {
      title: forStudent ? `${ar.label}: where is your student now?` : `${ar.label}: where are you now?`,
      hint: answered === list.length
        ? "All topics answered. Press a topic to change its answer."
        : forStudent
          ? `For each topic, pick the line that sounds most like your student. At least one. ${answered} of ${list.length} answered.`
          : `For each topic, pick the line that sounds most like you. ${answered} of ${list.length} answered.`,
      hue: AREA_LOOK[ar.id].hue,
      ready: answered === list.length,
      ...(forStudent ? { canNext: answered > 0 } : {}),
      body: <TopicStep key={ar.id} area={ar.id} topics={a.topics} onTopics={(t) => set("topics", t)} />,
    };
  });
}

function voiceStep(a: PlanAnswers, set: SetAnswer, { forStudent = false }: QuestionOpts = {}): ModalStep {
  const type = a.voice?.type;
  return {
    title: forStudent ? "Your student's voice" : "Your voice",
    hue: AREA_LOOK.voice.hue,
    hint: forStudent ? "Optional. Pick their voice type, or leave it at Not sure." : "Optional. Pick a type, or find your range with the mic.",
    body: (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VOICES) as Voice[]).map((v, i) => <Chip key={v} hue={hueAt(i)} on={type === v} onClick={() => set("voice", { ...a.voice, type: v })}>{VOICES[v].label}</Chip>)}
          <Chip on={!type} onClick={() => set("voice", undefined)}>Not sure</Chip>
        </div>
        {!forStudent && type && a.voice?.range && <p className="text-xs text-slate-400">Range found. It is kept with your answers.</p>}
        {!forStudent && <RangeFinder onRange={(range, v) => set("voice", { type: v, range })} />}
      </div>
    ),
  };
}

/** The screens after the topics: voice (when Voice is chosen and `voice` isn't false), minutes a day, anything else. */
export function restSteps(a: PlanAnswers, set: SetAnswer, voice = true, opts: QuestionOpts = {}): ModalStep[] {
  const forStudent = opts.forStudent ?? false;
  return [
    ...(voice && a.areas.includes("voice") ? [voiceStep(a, set, opts)] : []),
    {
      title: forStudent ? "How long can your student practise a day?" : "How long can you practise a day?",
      body: (
        <div role="radiogroup" className="grid grid-cols-3 gap-3 desk:grid-cols-6">
          {MINUTES.map((m, i) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={a.minutes === m}
              onClick={() => set("minutes", m)}
              className={`flex cursor-pointer flex-col items-center rounded-xl border py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(hueAt(i), a.minutes === m)}`}
            >
              <span className="text-xl font-medium tabular-nums">{m}</span>
              <span className="text-xs opacity-70">min</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Anything else?",
      hint: "Optional",
      body: (
        <div className="flex flex-col gap-3">
          <textarea className={`${field} min-h-24`} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder={forStudent ? "A song they want to learn, an injury, a gig in a month…" : "A song you want to learn, an injury, a gig in a month…"} />
          <label className="text-xs text-slate-500">
            {forStudent ? "Styles they like" : "Styles you like"}
            <input className={`${field} mt-1`} value={a.styles} onChange={(e) => set("styles", e.target.value)} placeholder="Optional: only flavours the drills (blues, folk…)" />
          </label>
        </div>
      ),
    },
  ];
}

/**
 * The whole first questionnaire as step-modal screens over `draft`: what you play, one topic screen per chosen area,
 * voice (if Voice is chosen), minutes, anything else. The screen count follows the answers. `opts.forStudent` words them
 * for a teacher answering for a student (`QuestionOpts`).
 */
export function questionSteps(draft: PlanAnswers, set: SetAnswer, opts: QuestionOpts = {}): ModalStep[] {
  return [areasStep(draft, set, opts), ...topicSteps(draft, set, draft.areas, opts), ...restSteps(draft, set, true, opts)];
}
