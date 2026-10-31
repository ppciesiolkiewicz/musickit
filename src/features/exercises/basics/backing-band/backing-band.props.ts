/**
 * A small backing band to play along with: click, drone, drums and bass, in a key at a tempo.
 * @component backing-band basic
 */
export interface BackingBandProps {
  /** tempo, 30-240 */
  bpm: number;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** which instruments play */
  parts: ("click" | "drone" | "drums" | "bass")[];
}
