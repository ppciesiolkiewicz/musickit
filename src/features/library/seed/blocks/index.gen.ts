// Written by scripts/gen-json-index.mjs; don't edit by hand. Run `npm run -s gen:json-index` after adding or removing a file here.
import f0_guitar_beginner_slides from "./guitar-beginner-slides.json";
import f1_guitar_beginner_small_f_to_bm from "./guitar-beginner-small-f-to-bm.json";
import f2_theory_new_steady_beat from "./theory-new-steady-beat.json";
import f3_voice_new_holding_a_note from "./voice-new-holding-a-note.json";

export const FILES: Record<string, unknown> = {
  "guitar-beginner-slides": f0_guitar_beginner_slides,
  "guitar-beginner-small-f-to-bm": f1_guitar_beginner_small_f_to_bm,
  "theory-new-steady-beat": f2_theory_new_steady_beat,
  "voice-new-holding-a-note": f3_voice_new_holding_a_note,
};
