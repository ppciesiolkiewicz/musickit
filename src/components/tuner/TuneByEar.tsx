"use client";

import { useEffect, useState } from "react";
import { Chip, ChipRow, Section, Select } from "@/components/ui";
import { VOICES, savedVoice, type Voice } from "@/features/theory/singing";
import { View as StringSinger } from "@/features/exercises/basics/string-singer";
import { View as TuningEars } from "@/features/exercises/basics/tuning-ears";
import type { StringDrill } from "@/features/exercises/basics/string-singer/strings";

/* the singing page's voice, so a singer picks it once */
const VOICE_KEY = "singing.range";

const DRILLS: { id: StringDrill; label: string }[] = [
  { id: "strings", label: "Open strings" },
  { id: "pairs", label: "Pairs" },
  { id: "fifth-fret", label: "5th fret" },
];

const CENTS = [{ value: 30, label: "Easy · 30¢" }, { value: 20, label: "Medium · 20¢" }, { value: 10, label: "Hard · 10¢" }, { value: 5, label: "Very hard · 5¢" }] as const;

const VOICE_OPTIONS = (Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: VOICES[v].label }));

/**
 * Under the tuner: tuning without it. Sing the open strings (the string singer, in the singer's voice) to carry their
 * pitches, then the listening game: is the next string flat, sharp or in tune against the 5th-fret reference.
 */
export default function TuneByEar() {
  const [drill, setDrill] = useState<StringDrill>("strings");
  const [voice, setVoice] = useState<Voice>("tenor");
  const [cents, setCents] = useState<number>(20);
  const [together, setTogether] = useState(false);
  useEffect(() => {
    let saved: Voice | null = null;
    try { saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null")); } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved voice after hydration
    if (saved) setVoice(saved);
  }, []);
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try { window.localStorage.setItem(VOICE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  return (
    <div className="mt-6 flex flex-col gap-4">
      <h2 className="text-lg font-light tracking-wide text-slate-100">Tune by ear</h2>
      <Section title="Sing the open strings" meta="mic" info="Play the drill to hear it, tap a note to hear one, then sing along with the mic on: the strings land in your voice's range, an octave or two from the guitar. Once you can sing E A D G B E, you can hear a string that is off.">
        <div className="flex flex-col gap-3">
          <ChipRow label="Drill">
            {DRILLS.map((d) => <Chip key={d.id} on={drill === d.id} onClick={() => setDrill(d.id)}>{d.label}</Chip>)}
          </ChipRow>
          <ChipRow label="Voice">
            <Select value={voice} onChange={pickVoice} options={VOICE_OPTIONS} aria-label="Voice" size="sm" pill />
          </ChipRow>
          <StringSinger drill={drill} voice={voice} />
        </div>
      </Section>
      <Section title="Flat, sharp or in tune?" meta="listening" info="The 5th-fret reference plays, then the next open string, a little out or in tune. Say which. Together rings both at once: strings out of tune beat, and the beats slow down as they come in.">
        <div className="flex flex-col gap-3">
          <ChipRow label="How far out">
            <Select value={cents} onChange={setCents} options={CENTS} aria-label="How far out" size="sm" pill />
          </ChipRow>
          <ChipRow label="Notes">
            <Chip on={!together} onClick={() => setTogether(false)}>One after the other</Chip>
            <Chip on={together} onClick={() => setTogether(true)}>Together</Chip>
          </ChipRow>
          <TuningEars key={`${cents}-${together}`} cents={cents} together={together} />
        </div>
      </Section>
    </div>
  );
}
