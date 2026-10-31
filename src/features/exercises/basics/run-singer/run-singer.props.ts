/**
 * A run from the singing page's runs book on a staff, starting in a key and moving up a semitone each pass, in a voice:
 * play it, then sing it with the microphone. Pick the run from `runChoices()` (one per stage).
 * @component run-singer basic
 */
export interface RunSingerProps {
  /** the run's number in the runs book (a number, from runChoices) */
  run: number;
  /** the key the run starts in: "c", "f-sharp", "b-flat" */
  key: string;
  /** voice range; default "soprano" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
