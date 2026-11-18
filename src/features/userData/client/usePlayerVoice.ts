"use client";

import { useMemo } from "react";
import type { Range, Voice } from "@/features/theory/singing";
import { rangeOf, typeOf, voiceWords, type SingerVoice } from "@/features/theory/voiceRange";
import { useUserDoc } from "./useUserDoc";

/**
 * The player's singing voice, kept with their account (`user_voices`): `voice` as stored (a voice type or a range of
 * their own; null while it is not known or not loaded), the `type` and `range` the singing tools use for it (the
 * range's `label` is the type's name, or the whole range when it is their own), and `set` to change it (null: not known).
 */
export function usePlayerVoice(): { voice: SingerVoice | null; type: Voice | null; range: (Range & { label: string }) | null; set: (v: SingerVoice | null) => void; loaded: boolean } {
  const [voice, set, loaded] = useUserDoc("voice");
  return useMemo(
    () => ({ voice, type: voice ? typeOf(voice) : null, range: voice ? { ...rangeOf(voice), label: voiceWords(voice) } : null, set, loaded }),
    [voice, set, loaded],
  );
}
