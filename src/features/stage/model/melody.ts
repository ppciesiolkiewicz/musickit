/** px a beat is given across a melody widget: between the staff's own MIN_BEAT (44) and MAX_BEAT (72) */
const BEAT_PX = 64;
/** the staff's fixed head (clef, time signature) and its right pad */
const HEAD_PX = 92;

/** The width a melody widget is laid out at: its head plus `beats` (default 10) across, so fewer beats scale up into bigger notes. */
export function melodyDesignWidth(beats?: number): number {
  return HEAD_PX + (beats ?? 10) * BEAT_PX;
}
