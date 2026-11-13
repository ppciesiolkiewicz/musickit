import script from "./script.json";
import voice from "./voice.json";
import type { IntroScript, VoiceManifest } from "./timeline";

/** The tour's script and its recorded narration, typed (JSON imports type every scene's cues apart). */
export const SCRIPT = script as unknown as IntroScript;
export const VOICE = voice as unknown as VoiceManifest;
