// Written by scripts/gen-json-index.mjs; don't edit by hand. Run `npm run -s gen:json-index` after adding or removing a file here.
import f0_guitar_advanced from "./guitar-advanced.json";
import f1_guitar_beginner from "./guitar-beginner.json";
import f2_guitar_intermediate from "./guitar-intermediate.json";
import f3_guitar_new_first_week from "./guitar-new-first-week.json";
import f4_guitar_theory_intermediate from "./guitar-theory-intermediate.json";
import f5_theory_only_first_week from "./theory-only-first-week.json";
import f6_voice_advanced from "./voice-advanced.json";
import f7_voice_beginner from "./voice-beginner.json";
import f8_voice_guitar_advanced_first_week from "./voice-guitar-advanced-first-week.json";
import f9_voice_intermediate from "./voice-intermediate.json";

export const FILES: Record<string, unknown> = {
  "guitar-advanced": f0_guitar_advanced,
  "guitar-beginner": f1_guitar_beginner,
  "guitar-intermediate": f2_guitar_intermediate,
  "guitar-new-first-week": f3_guitar_new_first_week,
  "guitar-theory-intermediate": f4_guitar_theory_intermediate,
  "theory-only-first-week": f5_theory_only_first_week,
  "voice-advanced": f6_voice_advanced,
  "voice-beginner": f7_voice_beginner,
  "voice-guitar-advanced-first-week": f8_voice_guitar_advanced_first_week,
  "voice-intermediate": f9_voice_intermediate,
};
