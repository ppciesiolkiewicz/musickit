import script from "./script.json";
import george from "./voices/george.json";
import charlie from "./voices/charlie.json";
import laura from "./voices/laura.json";
import sarah from "./voices/sarah.json";
import type { IntroScript, VoiceManifest } from "./timeline";

/** The tour's script and its recorded narration, typed (JSON imports type every scene's cues apart). */
export const SCRIPT = script as unknown as IntroScript;

/** Every recorded voice, in the order `?voice=1|2|3|4` picks them (the same names as VOICES in scripts/intro/voice.mjs). */
export const VOICES = [george, charlie, laura, sarah] as unknown as VoiceManifest[];

/** The voice the tour plays without `?voice`: Charlie. */
export const DEFAULT_VOICE = 1;

/** The voice a page's `?voice=` asks for (1-based), or the default when it is missing or out of range. */
export function voiceFromQuery(search: string): number {
  const n = Number(new URLSearchParams(search).get("voice"));
  return Number.isInteger(n) && n >= 1 && n <= VOICES.length ? n - 1 : DEFAULT_VOICE;
}
