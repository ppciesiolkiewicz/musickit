/**
 * A metronome click and/or a drone on the key's root to play or sing against.
 * @component click-drone basic
 */
export interface ClickDroneProps {
  /** tempo, 30-240 */
  bpm: number;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** play the click; default true */
  click?: boolean;
  /** play the drone on the root; default true */
  drone?: boolean;
}
