"use client";

import { Chip, hueAt } from "@/components/ui";
import { VOICES, type Voice } from "@/features/theory/singing";
import { rangeWords, type SingerVoice } from "@/features/theory/voiceRange";
import { usePlayerVoice } from "@/features/userData/client/usePlayerVoice";
import RangeFinder from "./RangeFinder";

/**
 * The voice a player sings with: their own range, found with the microphone (first, since it fits them better than an
 * average), or a voice type, whose range is its definition. One or the other: finding a range drops the type, and
 * picking a type drops the range. `finder` false leaves the microphone out (a teacher answering for a student).
 */
export function VoiceField({ value, onChange, finder = true }: { value: SingerVoice | null; onChange: (v: SingerVoice | null) => void; finder?: boolean }) {
  const type = value?.range ? undefined : value?.type;
  return (
    <div className="flex flex-col gap-4">
      {finder && <RangeFinder current={value?.range ?? null} onRange={(range) => onChange({ range })} />}
      <div className="flex flex-col gap-2">
        {finder && <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Or pick a voice type</p>}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VOICES) as Voice[]).map((v, i) => <Chip key={v} hue={hueAt(i)} on={type === v} onClick={() => onChange({ type: v })}>{VOICES[v].label}</Chip>)}
          <Chip on={!value} onClick={() => onChange(null)}>Not sure</Chip>
        </div>
        {type && (
          <p className="text-xs text-slate-400">
            {VOICES[type].label}: {rangeWords(VOICES[type])}. The singing exercises use this range.
            {finder && " A voice type is an average of many voices. Press Find my range above to use your own."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The player's own voice (`user_voices`), changed the moment they pick: it is theirs on every page, not one answer of
 * this questionnaire. `onPicked` hands each change to the questionnaire too, which keeps it with the answers.
 */
export default function YourVoice({ onPicked }: { onPicked?: (v: SingerVoice | null) => void }) {
  const { voice, set } = usePlayerVoice();
  return <VoiceField value={voice} onChange={(v) => { set(v); onPicked?.(v); }} />;
}
