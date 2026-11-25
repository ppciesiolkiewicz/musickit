"use client";

import Link from "next/link";
import type { Ref } from "react";
import { ErrorLine } from "./parts";

/** what the voice-care box says when Continue is pressed without it */
export const VOICE_CARE_ERROR = "Please tick the box to say you'll look after your voice.";

/**
 * The voice-care box on /account/setup (`SetupForm`) and a personal invite's setup (`JoinSetup`): one line that says the
 * person read the safety notes, which are on their own page (/voice-care, opened in a new tab so nothing typed is lost).
 * Asked, not stored; the terms say the same in "Your voice and your body".
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
      <label className="flex items-start gap-3 text-sm">
        <input
          ref={inputRef}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 scroll-mt-24 accent-sky-400"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="text-slate-200">
          I&apos;ve read{" "}
          <Link href="/voice-care" target="_blank" className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">Look after your voice</Link>{" "}
          and I&apos;ll look after my voice when I sing.
        </span>
      </label>
      <ErrorLine id={`${id}-error`}>{error}</ErrorLine>
    </div>
  );
}
