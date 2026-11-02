/**
 * A run from the singing page's runs book on a staff, starting in a key and moving up a semitone each pass, in a voice:
 * play it, then sing it with the microphone. Pick the run from `runChoices()` (one per stage).
 * @component run-singer basic
 */
export interface RunSingerProps {
  /** the run's number in the runs book (a number, from runChoices); omit it and give `pick` instead */
  run?: number;
  /** choose the run by what it is like instead of by number: difficulty (easy, medium, hard, expert), a stage id and which of the matches (index from 0) */
  pick?: { difficulty?: string; stage?: string; index?: number };
  /** the key the run starts in: "c", "f-sharp", "b-flat" */
  key: string;
  /** voice range; default "soprano" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
  /** the piano's chords under the tune, one a bar, named over the staff; in a run, the two chords in the held-Do bar that announce each new key. Default true; false for the tune alone */
  chords?: boolean;
  /** the metronome heard from the start, on the tune's beats (beat 1 of each bar accented); default false. The student can switch it, the tune and the chords on and off in the player either way */
  metronome?: boolean;
}
