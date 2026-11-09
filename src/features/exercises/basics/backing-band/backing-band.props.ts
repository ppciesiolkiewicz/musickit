/**
 * A metronome, a drone on the key's root, drums and bass to play or listen along with, in a key at a tempo; each part offered
 * gets a switch. `parts` says which are offered and how each starts.
 * Example: `{ "type": "backing-band", "bpm": 70, "key": "a", "parts": { "click": "on" } }` is a plain metronome.
 * Example: `{ "type": "backing-band", "bpm": 60, "key": "e", "parts": { "drone": "always", "click": "off" } }` keeps the drone
 * sounding and lets the student add the click.
 * @component backing-band basic
 */
export interface BackingBandProps {
  /** tempo, 30-240 */
  bpm: number;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /**
   * the parts offered, "click", "drone", "drums", "bass", each with how it starts: "on" (playing, the student can switch it
   * off), "off" (silent, the student can switch it on), "always" (playing, no switching it off). A part left out is not there
   */
  parts: { click?: "on" | "off" | "always"; drone?: "on" | "off" | "always"; drums?: "on" | "off" | "always"; bass?: "on" | "off" | "always" };
}
