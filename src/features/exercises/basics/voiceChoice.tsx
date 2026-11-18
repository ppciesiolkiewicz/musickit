"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Select } from "@/components/ui";
import { VOICES, type Range, type Voice } from "@/features/theory/singing";
import { rangeOf, typeOf, voiceWords, type SingerVoice } from "@/features/theory/voiceRange";

/**
 * A voice chosen on the page for every singing tool under it, over the voice each tool was written with. Only the demo plans and
 * the preset notes give one (a visitor's voice is unknown there); a student's own plan has none, so its tools keep their own voice.
 */
const VoiceChoice = createContext<{ voice: Voice; range?: Range & { label: string } } | null>(null);

/** The page's chosen voice if it has one, else the tool's own. */
export function useVoice<V extends Voice | undefined>(own: V): V | Voice {
  return useContext(VoiceChoice)?.voice ?? own;
}

/**
 * The range a singing tool lays its notes in, with its name for the screen: the player's own range when the page gives
 * one ("A2 to E4"), else the voice type's range from its definition ("Tenor"). `voice` comes from `useVoice`.
 */
export function useVoiceRange(voice: Voice | undefined, fallback: Voice = "tenor"): Range & { label: string } {
  const own = useContext(VoiceChoice)?.range;
  return own ?? VOICES[voice as Voice] ?? VOICES[fallback];
}

/**
 * The player's voice for every singing tool under it, over the voice each tool was written with: their voice type, or
 * their own range. With no voice known, or under a voice already chosen on the page, the tools are left as they are.
 */
export function SingerVoiceProvider({ voice, children }: { voice: SingerVoice | null; children: ReactNode }) {
  const outer = useContext(VoiceChoice);
  const value = useMemo(
    () => (voice ? { voice: typeOf(voice), ...(voice.range ? { range: { ...rangeOf(voice), label: voiceWords(voice) } } : {}) } : null),
    [voice],
  );
  if (!value || outer) return <>{children}</>;
  return <VoiceChoice.Provider value={value}>{children}</VoiceChoice.Provider>;
}

/** The first voice a singing tool in this data was written with (tools carry it as `voice: "tenor"`), or null when none sings. */
export function voiceIn(data: unknown): Voice | null {
  if (Array.isArray(data)) {
    for (const x of data) {
      const v = voiceIn(x);
      if (v) return v;
    }
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.type === "string" && typeof rec.voice === "string" && Object.hasOwn(VOICES, rec.voice)) return rec.voice as Voice;
  return voiceIn(Object.values(rec));
}

const OPTIONS = (Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: VOICES[v].label }));

/**
 * The Your voice picker over `children`, starting on the voice the data's tools were written with; nothing is drawn round
 * `children` when no tool in `data` sings. The choice lives in the page only.
 */
export function VoicePicker({ data, children }: { data: unknown; children: ReactNode }) {
  const written = useMemo(() => voiceIn(data), [data]);
  const [voice, setVoice] = useState<Voice | null>(null);
  const chosen = useMemo(() => (voice ? { voice } : null), [voice]);
  if (!written) return <>{children}</>;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-slate-200">Your voice</span>
        <Select value={voice ?? written} onChange={setVoice} options={OPTIONS} size="sm" aria-label="Your voice" />
        <span className="text-xs text-slate-400">The singing tools on this page use it.</span>
      </div>
      <VoiceChoice.Provider value={chosen}>{children}</VoiceChoice.Provider>
    </>
  );
}
