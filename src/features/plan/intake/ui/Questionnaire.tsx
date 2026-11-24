"use client";

import Icon from "@/components/Icon";
import { Tile, hueAt, hueClass, type Hue, type ModalStep } from "@/components/ui";
import { AREAS, type Area } from "../../model/concepts";
import { keyName } from "@/features/theory/keySlug";
import { KEY_RUNGS, keyRung, keysAt, type KeyRung } from "../../model/keys";
import { MINUTES, levelOf, type PlanAnswers } from "../answers";
import { topicsFor } from "../topics";
import YourVoice, { VoiceField } from "./YourVoice";
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
 * listens to the person at the microphone) and its answer goes with the others to the student's account, and each topic
 * screen needs one answer (an area with none can't make a plan). A player's own voice screen changes their voice at
 * once (`YourVoice`, their `user_voices` row) and keeps a copy with the answers.
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
  return {
    title: forStudent ? "Your student's voice" : "Your voice",
    hue: AREA_LOOK.voice.hue,
    hint: forStudent
      ? "Optional. Pick their voice type, or leave it at Not sure. Your student can find their own range later, on Sing a scale."
      : "Optional. Find your range with the microphone, or pick a voice type.",
    body: forStudent
      ? <VoiceField finder={false} value={a.voice ?? null} onChange={(v) => set("voice", v ?? undefined)} />
      : <YourVoice onPicked={(v) => set("voice", v ?? undefined)} />,
  };
}

/** The lines of the keys question, one per rung of the key ladders (`KEY_LADDERS`), in the player's own words. */
const KEY_LINES: Record<KeyRung, { name: string; line: string }> = {
  0: { name: "One key", line: "I play or sing everything in one key." },
  1: { name: "Two or three keys", line: "I know a couple of easy keys." },
  2: { name: "The common keys", line: "Most songs I meet are in a key I know." },
  3: { name: "Most keys", line: "Only keys with many sharps or flats slow me down." },
  4: { name: "Any key", line: "Every key feels the same." },
};

/** The keys shown under each answer: the same short list for every area. The first two answers name the easy keys. */
const EASY_KEYS = [0, 7, 2, 4, 9, 5].map((k) => keyName(k));
const KEY_EXAMPLES: Record<KeyRung, string[]> = {
  0: EASY_KEYS,
  1: EASY_KEYS,
  2: [...EASY_KEYS, ...[10, 3].map((k) => keyName(k))],
  3: [...EASY_KEYS, ...[10, 3, 8, 11].map((k) => keyName(k))],
  4: ["All 12"],
};

/** "A", "A and G", "A, G and C". */
const listed = (keys: number[]): string => {
  const names = keys.map((k) => keyName(k));
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/**
 * One question for the whole plan: how many keys they are at home in. The answer is a rung of every area's key ladder,
 * so the cards list example keys and, under them, each chosen area says the keys its exercises start in. Not sure leaves it to each area's level.
 */
function keysStep(a: PlanAnswers, set: SetAnswer, { forStudent = false }: QuestionOpts = {}): ModalStep {
  const tag = "inline-flex min-w-7 justify-center rounded-md border border-current/40 px-1.5 py-0.5 text-xs font-medium";
  const row = (on: boolean, pick: () => void, name: string, line: string, i: number, r?: KeyRung) => (
    <button
      key={name}
      type="button"
      role="radio"
      aria-checked={on}
      onClick={pick}
      className={`flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border px-3 pt-2 pb-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${hueClass(hueAt(i), on)}`}
    >
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs opacity-80">{line}</span>
      {r !== undefined && (
        <span className="flex flex-wrap gap-1">
          {KEY_EXAMPLES[r].map((k) => <span key={k} className={tag}>{k}</span>)}
        </span>
      )}
    </button>
  );
  return {
    title: forStudent ? "How many keys is your student at home in?" : "How many keys are you at home in?",
    hint: forStudent
      ? "Optional. One answer for the whole plan: it sets the keys their exercises start in."
      : "Optional. One answer for your whole plan: it sets the keys your exercises start in.",
    body: (
      <div className="flex flex-col gap-4">
        <div role="radiogroup" className="grid gap-2 desk:grid-cols-2">
          {KEY_RUNGS.map((r, i) => row(a.keys === r, () => set("keys", r), KEY_LINES[r].name, KEY_LINES[r].line, i, r))}
          {row(a.keys === undefined, () => set("keys", undefined), "Not sure", forStudent ? "The plan picks the keys from their other answers." : "The plan picks the keys from your other answers.", KEY_RUNGS.length)}
        </div>
        <ul className="flex flex-col gap-1 text-xs text-slate-400">
          {AREAS.filter((ar) => a.areas.includes(ar.id)).map((ar) => {
            const { now, back } = keysAt(ar.id, keyRung(a.keys, levelOf(a, ar.id)));
            return (
              <li key={ar.id}>
                <span className="font-medium text-slate-200">{ar.label}:</span> {forStudent ? "their" : "your"} exercises start in {listed(now)}.
                {back.length > 0 && ` ${listed(back.slice(0, 3))} ${back.slice(0, 3).length > 1 ? "stay" : "stays"} in the Key selector, under Earlier.`}
              </li>
            );
          })}
        </ul>
      </div>
    ),
  };
}

/** The screens after the topics: voice (when Voice is chosen and `voice` isn't false), minutes a day, the keys, anything else. */
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
    keysStep(a, set, opts),
    {
      title: "Anything else?",
      hint: forStudent ? "Optional. Anything the questions missed about your student. Our team reads every note." : "Optional. Anything the questions missed. Our team reads every note.",
      body: (
        <div className="flex flex-col gap-3">
          <textarea className={`${field} min-h-24`} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder={forStudent ? "A song they want to learn, an injury, a gig in a month…" : "A song you want to learn, an injury, a gig in a month…"} />
          <label className="text-xs text-slate-500">
            {forStudent ? "Styles they like (optional)" : "Styles you like (optional)"}
            <input className={`${field} mt-1`} value={a.styles} onChange={(e) => set("styles", e.target.value)} placeholder="Blues, folk, rock…" />
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
