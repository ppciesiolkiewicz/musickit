/**
 * A lip roll warm-up with the mic: a soft tone slides from head voice down to chest voice (or back up, or holds one
 * note) while a line shows its path over the voice's registers, then the student lip rolls the same path on their own
 * while the mic draws their line over it. Each round is: listen, your turn, a short rest; `plays` rounds in all. The
 * slide crosses both breaks of the voice type (typical ones, `REGISTERS`), so it smooths the change from head to chest
 * voice. The line is loose on purpose: a lip roll is about an easy, steady buzz, not an exact note. A singing warm-up,
 * for the start of a voice session.
 * @component lip-roll basic
 */
export interface LipRollProps {
  /** the path: "down" (default; from head voice to chest voice), "up" (chest to head voice), "siren" (up and back down) or "hold" (one steady chest-voice note) */
  shape?: "down" | "up" | "siren" | "hold";
  /** "hold" only: how long the note lasts, 2-10 seconds; default 5 */
  seconds?: number;
  /** how many rounds, 1-8; default 3 */
  plays?: number;
  /** voice range; default "tenor" */
  voice?: "soprano" | "mezzo" | "alto" | "tenor" | "baritone" | "bass";
}
