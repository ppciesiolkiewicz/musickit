"use client";

import { useState, type ReactNode } from "react";
import { Chip, ChipRow, Select } from "@/components/ui";
import { View as LipRoll } from "@/features/exercises/basics/lip-roll";
import type { LipRollProps } from "@/features/exercises/basics/lip-roll/lip-roll.props";
import { View as VoiceHill } from "@/features/exercises/basics/voice-hill";
import type { VoiceHillProps } from "@/features/exercises/basics/voice-hill/voice-hill.props";
import { VOICES, type Voice } from "@/features/theory/singing";

type WarmUp = { id: string; label: string; title: string } & ({ tool: "lip-roll"; props: LipRollProps } | { tool: "voice-hill"; props: VoiceHillProps });

/** The warm-ups in the order to do them: lip rolls first to loosen up, then the low voice, the middle, and the light high voice last. */
const WARM_UPS: WarmUp[] = [
  { id: "roll-down", label: "Slide down", title: "A lip roll sliding down a 5th", tool: "lip-roll", props: { shape: "down" } },
  { id: "roll-siren", label: "Siren", title: "A lip roll up an octave and back", tool: "lip-roll", props: { shape: "siren", span: 12 } },
  { id: "roll-hold", label: "One note", title: "A lip roll on one steady note", tool: "lip-roll", props: { shape: "hold" } },
  { id: "hill-low-hum", label: "Low hum", title: "Hum low and roll the ball into the hollow", tool: "voice-hill", props: { where: "low", sound: "hum" } },
  { id: "hill-low-oo", label: "Low oo", title: "Sing “oo” low", tool: "voice-hill", props: { where: "low", sound: "oo" } },
  { id: "hill-middle", label: "Middle oo", title: "Sing “oo” in the middle of your voice", tool: "voice-hill", props: { where: "middle", sound: "oo", seconds: 5, reps: 3 } },
  { id: "hill-high", label: "High oo", title: "Sing “oo” light and high", tool: "voice-hill", props: { where: "high", sound: "oo", seconds: 2 } },
];

const VOICE_OPTIONS = (Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: VOICES[v].label }));

/** The voice warm-ups page: a Lip roll and a Hill selector (one warm-up at a time) and Your voice over the tool. A new pick starts it over. */
export default function WarmUpsApp({ lead }: { lead?: ReactNode }) {
  const [id, setId] = useState(WARM_UPS[0].id);
  const [voice, setVoice] = useState<Voice>("tenor");
  const w = WARM_UPS.find((x) => x.id === id)!;
  const row = (tool: WarmUp["tool"], label: string) => (
    <ChipRow label={label}>
      {WARM_UPS.filter((x) => x.tool === tool).map((x) => (
        <Chip key={x.id} on={x.id === id} onClick={() => setId(x.id)} title={x.title}>{x.label}</Chip>
      ))}
    </ChipRow>
  );
  return (
    <div>
      {lead}
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-3 flex flex-col gap-2">
          {row("lip-roll", "Lip roll")}
          {row("voice-hill", "The hill")}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-28 shrink-0 text-xs uppercase tracking-wider text-slate-400">Your voice</span>
            <Select value={voice} onChange={setVoice} options={VOICE_OPTIONS} size="sm" aria-label="Your voice" />
          </div>
        </div>
        {w.tool === "lip-roll"
          ? <LipRoll key={`${w.id}-${voice}`} {...w.props} voice={voice} />
          : <VoiceHill key={`${w.id}-${voice}`} {...w.props} voice={voice} />}
      </div>
    </div>
  );
}
