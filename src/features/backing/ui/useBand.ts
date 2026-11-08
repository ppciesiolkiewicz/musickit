"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus, useAudioFocus, wakeAudio } from "@/features/sound";
import { Band } from "../audio/band";
import { clampSettings } from "../model/settings";

const KEY = "musickit.backing";

/**
 * The page's band: one `Band` on the app's AudioContext and output, its settings read back from localStorage after hydration
 * and written on every change, stopped on unmount, holding the app's audio focus while it plays (another source starting, or
 * the band scrolling away, stops it). Returns the band, its snapshot, and the ref for the element the focus watches.
 */
export function useBand() {
  const [band] = useState(() => new Band({ context: getAudioContext, destination: getOutputBus, wake: wakeAudio }));
  const snap = useSyncExternalStore(band.subscribe, band.getSnapshot, band.getSnapshot);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) band.set(clampSettings(JSON.parse(raw)));
    } catch {
      // a broken or blocked save: keep the defaults
    }
    return () => band.stop();
  }, [band]);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snap.settings));
    } catch {
      // storage full or blocked: the settings simply aren't remembered
    }
  }, [snap.settings]);

  const focus = useAudioFocus(snap.playing, () => band.stop());
  return { band, snap, focus };
}
