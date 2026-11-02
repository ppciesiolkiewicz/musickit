/** Who holds the audio focus: the sources that may play (a band, a play-along, a tune), one unless they share a group. */
let holders: { stop: () => void; group?: string }[] = [];

/**
 * Take the audio focus for a source starting to play: whatever held it is stopped first, except sources in the same
 * `group` (the sounds one "Start exercise" started play together). Returns the release, to call when the source stops by
 * itself; it does nothing once another source has taken the focus.
 */
export function takeAudioFocus(stop: () => void, group?: string): () => void {
  const mine = { stop, group };
  const together = (h: (typeof holders)[number]) => group !== undefined && h.group === group;
  const stopped = holders.filter((h) => !together(h));
  holders = [...holders.filter(together), mine];
  stopped.forEach((h) => h.stop());
  return () => {
    holders = holders.filter((h) => h !== mine);
  };
}
