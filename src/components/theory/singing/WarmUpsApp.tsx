"use client";

import VoiceSelect from "./VoiceSelect";
import { usePlayerVoice } from "@/features/userData/client/usePlayerVoice";
import { SingerVoiceProvider } from "@/features/exercises/basics/voiceChoice";
import { useState } from "react";
import { GameChoice } from "@/components/practice/shared";
import Lesson from "@/components/theory/Lesson";
import { SettingsPanel, SettingsRow, SettingsSection } from "@/components/ui";
import { View as LipRoll } from "@/features/exercises/basics/lip-roll";
import type { LipRollPlay, LipRollSpeed } from "@/features/exercises/basics/lip-roll/glide";
import { LipRollSettings, type LipRollShape } from "@/features/exercises/basics/lip-roll/settings";
import { View as VoiceHill } from "@/features/exercises/basics/voice-hill";
import { HILL_PLACES, HillSettings, type HillPlace, type HillSoundChoice } from "@/features/exercises/basics/voice-hill/settings";
import type { Voice } from "@/features/theory/singing";
import { VolumeRow } from "@/features/settings";


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


/**
 * The voice warm-ups page: why and what to try (both), what to practice (Lip roll or The hill, two separate tools) and
 * what to do in the one picked, over the tool; the picked tool's own choices and Voice in the settings column, as on the
 * other singing pages. A choice changes the tool's props without remounting it, so a tool that is running keeps running
 * with the new settings.
 */
export default function WarmUpsApp() {
  const [kind, setKind] = useState<Kind>("lip-roll");
  const [shape, setShape] = useState<LipRollShape>("down");
  const [place, setPlace] = useState<HillPlace>("low");
  const [sound, setSound] = useState<HillSoundChoice>("hum");
  // the player's voice, shared with the other singing pages and kept with their account; tenor until it loads or is picked
  const singer = usePlayerVoice();
  const voice: Voice = singer.type ?? "tenor";
  const [play, setPlay] = useState<LipRollPlay>("echo");
  const [speed, setSpeed] = useState<LipRollSpeed>("medium");
  const h = HILL_PLACES.find((x) => x.id === place)!;
  const bar = (
    <SettingsSection first>
        <SettingsRow label="Voice">
          <VoiceSelect fallback="tenor" />
        </SettingsRow>
        {kind === "lip-roll"
          ? <LipRollSettings shape={shape} onShape={setShape} play={play} onPlay={setPlay} speed={speed} onSpeed={setSpeed} />
          : <HillSettings place={place} onPlace={setPlace} sound={sound} onSound={setSound} />}
        <VolumeRow />
    </SettingsSection>
  );
  return (
    <SettingsPanel settings={bar}>
      <div>
        <Lesson course="3/breath-and-holding-a-note" why={LESSON.why} tryThis={LESSON.tryThis} />
        <div data-tour="warm-ups-kind" className="mb-3"><GameChoice label="What to practice" options={KINDS} value={kind} onChange={setKind} tone="sky" /></div>
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2 text-sm leading-snug text-slate-300" aria-live="polite">
          {GUIDE[kind].map((line) => <p key={line}>{line}</p>)}
        </div>
        <div className="mx-auto w-full max-w-2xl">
          {kind === "lip-roll"
            ? <SingerVoiceProvider voice={singer.voice}><LipRoll shape={shape} play={play} speed={speed} voice={voice} hostSettings /></SingerVoiceProvider>
            : <SingerVoiceProvider voice={singer.voice}><VoiceHill {...h.props} sound={sound} voice={voice} hostSettings /></SingerVoiceProvider>}
        </div>
      </div>
    </SettingsPanel>
  );
}
