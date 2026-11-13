/**
 * A lip roll warm-up with the mic: a soft tone slides (or holds one note) while a line shows its path, then the
 * student lip rolls the same path back on their own while the mic draws their line over it. Each round is: listen,
 * your turn, a short rest; `plays` rounds in all. The line is loose on purpose: a lip roll is about an easy, steady
 * buzz, not an exact note. The slide sits low in the voice. A singing warm-up, for the start of a voice session.
 * @component lip-roll basic
 */
export interface LipRollProps {
  /** the path: "down" (default; a slide from high to low), "up" (low to high), "siren" (up and back down) or "hold" (one steady note) */
  shape?: "down" | "up" | "siren" | "hold";
  /** how wide the slide is, in semitones, 3-12; default 7 (a 5th); 12 is an octave. Not for "hold" */
  span?: number;
  /** "hold" only: how long the note lasts, 2-10 seconds; default 5 */
  seconds?: number;
  /** how many rounds, 1-8; default 3 */
  plays?: number;
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
