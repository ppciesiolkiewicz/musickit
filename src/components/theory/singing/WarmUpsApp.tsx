"use client";

import { useState } from "react";
import { GameChoice } from "@/components/practice/shared";
import Lesson from "@/components/theory/Lesson";
import { Chip, ChipRow, Select } from "@/components/ui";
import { View as LipRoll } from "@/features/exercises/basics/lip-roll";
import type { LipRollProps } from "@/features/exercises/basics/lip-roll/lip-roll.props";
import { View as VoiceHill } from "@/features/exercises/basics/voice-hill";
import type { VoiceHillProps } from "@/features/exercises/basics/voice-hill/voice-hill.props";
import { VOICES, type Voice } from "@/features/theory/singing";

type Kind = "lip-roll" | "voice-hill";

/** The two warm-ups, picked like the ear game's Intervals and Chord quality: what each is, in a line. */
const KINDS: { id: Kind; title: string; about: string }[] = [
  { id: "lip-roll", title: "Lip roll", about: "Hear the tone slide, then lip roll it back from head voice to chest voice." },
  { id: "voice-hill", title: "The hill", about: "Hold one easy sound low, in the middle or high while a ball shows your voice." },
];

/** Why the warm-ups matter and what to try, for both: over the choice of exercise. */
const LESSON = {
  why: "A voice warms up best with almost no effort: a lip roll loosens it while it slides through its breaks, and an easy held sound shows where its low, middle and head voice sit.",
  tryThis: "Do the lip roll first, then the hill. Pick your voice before you start, so every note sits where it is easy.",
};

/** What to do in the exercise picked, under the choice. */
const GUIDE: Record<Kind, string[]> = {
  "lip-roll": [
    "Let your lips buzz loosely and follow the tone from head voice down into chest voice. Each round goes a little deeper.",
    "Start on Slow with the tone, then try the pass on your own. Don't push to stay on the line: an easy, steady buzz matters more.",
  ],
  "voice-hill": [
    "Hold one easy sound and keep the ball on the green part until the ring fills. Low goes a semitone lower each hold.",
    "Let a hum wobble a little to stay loose. Go High last, on “oo”, light and soft.",
  ],
};

const ROLLS: { id: string; label: string; title: string; props: LipRollProps }[] = [
  { id: "down", label: "Slide down", title: "From head voice down to chest voice", props: { shape: "down" } },
  { id: "siren", label: "Siren", title: "From chest voice up to head voice and back", props: { shape: "siren" } },
  { id: "hold", label: "One note", title: "One steady chest-voice note", props: { shape: "hold" } },
];
const PLACES: { id: NonNullable<VoiceHillProps["where"]>; label: string; title: string; props: VoiceHillProps }[] = [
  { id: "low", label: "Low", title: "The bottom of your voice, a little lower each hold", props: { where: "low" } },
  { id: "middle", label: "Middle", title: "The middle of your voice, between two marks", props: { where: "middle", seconds: 5, reps: 3 } },
  { id: "high", label: "High", title: "Head voice, light and soft", props: { where: "high", seconds: 2 } },
];
const SOUNDS: { id: NonNullable<VoiceHillProps["sound"]>; label: string }[] = [
  { id: "hum", label: "Hum" },
  { id: "oo", label: "“oo”" },
  { id: "ee", label: "“ee”" },
];

const VOICE_OPTIONS = (Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: VOICES[v].label }));

/**
 * The voice warm-ups page: why and what to try (both), what to practise (Lip roll or The hill, two separate tools), what
 * to do in the one picked, its own choices and Your voice. A choice changes the tool's props without remounting it, so
 * a tool that is running keeps running with the new settings.
 */
export default function WarmUpsApp() {
  const [kind, setKind] = useState<Kind>("lip-roll");
  const [roll, setRoll] = useState(ROLLS[0].id);
  const [place, setPlace] = useState(PLACES[0].id);
  const [sound, setSound] = useState(SOUNDS[0].id);
  const [voice, setVoice] = useState<Voice>("tenor");
  const r = ROLLS.find((x) => x.id === roll)!;
  const h = PLACES.find((x) => x.id === place)!;
  return (
    <div>
      <Lesson course="3/breath-and-holding-a-note" why={LESSON.why} tryThis={LESSON.tryThis} />
      <div data-tour="warm-ups-kind" className="mb-3"><GameChoice label="What to practise" options={KINDS} value={kind} onChange={setKind} tone="sky" /></div>
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2 text-sm leading-snug text-slate-300" aria-live="polite">
        {GUIDE[kind].map((line) => <p key={line}>{line}</p>)}
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex flex-col gap-2">
          {kind === "lip-roll" ? (
            <ChipRow label="Slide">
              {ROLLS.map((x) => <Chip key={x.id} on={x.id === roll} onClick={() => setRoll(x.id)} title={x.title}>{x.label}</Chip>)}
            </ChipRow>
          ) : (
            <>
              <ChipRow label="Place">
                {PLACES.map((x) => <Chip key={x.id} on={x.id === place} onClick={() => setPlace(x.id)} title={x.title}>{x.label}</Chip>)}
              </ChipRow>
              <ChipRow label="Sound">
                {SOUNDS.map((x) => <Chip key={x.id} on={x.id === sound} onClick={() => setSound(x.id)}>{x.label}</Chip>)}
              </ChipRow>
            </>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-28 shrink-0 text-xs uppercase tracking-wider text-slate-400">Your voice</span>
            <Select value={voice} onChange={setVoice} options={VOICE_OPTIONS} size="sm" aria-label="Your voice" />
          </div>
        </div>
        {kind === "lip-roll"
          ? <LipRoll {...r.props} voice={voice} />
          : <VoiceHill {...h.props} sound={sound} voice={voice} />}
      </div>
    </div>
  );
}
