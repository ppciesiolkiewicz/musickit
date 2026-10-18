"use client";

import { useId, useSyncExternalStore } from "react";
import { currentTune, silence, subscribeTune } from "@/lib/chordKit/playback";

/**
 * The Sample melody button: plays a new tune, and while its tune plays it turns into Stop.
 * `onPlay` gets the button's tune id to pass on to playTimed, so another button's tune (or any other sound) resets it.
 */
export default function TuneButton({ onPlay, className, title }: { onPlay: (tuneId: string) => void; className: string; title: string }) {
  const id = useId();
  const playing = useSyncExternalStore(subscribeTune, () => currentTune() === id, () => false);
  return (
    <button type="button" onClick={() => (playing ? silence() : onPlay(id))} title={playing ? "Stop the tune" : title} aria-pressed={playing} className={`cursor-sound ${className}`}>
      {playing ? "■" : "▶"} Sample melody
    </button>
  );
}
