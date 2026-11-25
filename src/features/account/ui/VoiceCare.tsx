"use client";

import type { Ref } from "react";
import { ErrorLine } from "./parts";

/** what the voice-care box says when Continue is pressed without it */
export const VOICE_CARE_ERROR = "Please tick the box to say you'll look after your voice.";

const TIPS = [
  "Warm up first with a gentle hum, starting low and quiet.",
  "Sing at an easy volume. Don't shout, push or reach for high notes.",
  "Take short breaks and sip water as you practice.",
  "Don't sing when you're hoarse, losing your voice or have a sore throat.",
  "Stop if it hurts, your throat feels tight or scratchy, or you feel dizzy or light-headed. Rest your voice until it passes.",
  "See a doctor if hoarseness or pain lasts more than two weeks, or your voice changes suddenly. If you have a voice or breathing condition, ask a doctor before you start.",
];

/**
 * The voice-care box on /account/setup (`SetupForm`) and a personal invite's setup (`JoinSetup`): the safety notes
 * and the box that says the person read them. Asked, not stored; the terms say the same in "Your voice and your body".
 */
export function VoiceCareBox({ id, checked, onChange, error, inputRef }: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <p id={`${id}-title`} className="font-medium text-slate-100">Look after your voice</p>
        <ul id={`${id}-tips`} className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-slate-300">
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <label className="mt-4 flex items-start gap-3">
          <input
            ref={inputRef}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 scroll-mt-24 accent-sky-400"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-tips ${id}-error` : `${id}-tips`}
          />
          <span className="text-slate-200">I&apos;ve read this and I&apos;ll look after my voice.</span>
        </label>
      </div>
      <ErrorLine id={`${id}-error`}>{error}</ErrorLine>
    </div>
  );
}
