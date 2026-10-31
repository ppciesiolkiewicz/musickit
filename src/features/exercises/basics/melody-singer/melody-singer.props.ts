/**
 * A tune from the singing page's melody book on a staff, in a key and voice: play it to hear it, tap a note, then sing
 * it with the microphone along a bar that runs over the tune. Pick the tune from `melodyChoices()` (one per stage).
 * @component melody-singer basic
 */
export interface MelodySingerProps {
  /** the tune's number in the melody book (a number, from melodyChoices) */
  tune: number;
  /** the key's root note (Do): "c", "f-sharp", "b-flat" */
  key: string;
  /** voice range; default "soprano" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
