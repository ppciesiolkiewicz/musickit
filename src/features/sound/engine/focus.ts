/** Who holds the audio focus: the one source that may play (a band, a play-along, a tune). */
let holder: { stop: () => void } | null = null;

/**
 * Take the audio focus for a source starting to play: whatever held it is stopped first. Returns the release, to call when
 * the source stops by itself; it does nothing once another source has taken the focus.
 */
export function takeAudioFocus(stop: () => void): () => void {
  const mine = { stop };
  const prev = holder;
  holder = mine;
  prev?.stop();
  return () => {
    if (holder === mine) holder = null;
  };
}
