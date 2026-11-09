"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { Band } from "../audio/band";
import { clampSettings, type BandSettings } from "../model/settings";

export const BACKING_STORAGE_KEY = "musickit.backing";

export interface UseBandOptions {
  /** the settings it starts with (checked by `clampSettings`); a save, when there is one, wins */
  initial?: Partial<BandSettings>;
  /** where the settings are saved in localStorage; `null`: never read or written (a plan's backing starts as the plan set it) */
  storageKey?: string | null;
}

/**
 * One `Band` on the app's AudioContext and output, stopped on unmount. With a `storageKey` its settings are read back after
 * hydration and written on every change. Returns the band and its snapshot; `BackingPlayer` draws them and holds the audio focus.
 */
export function useBand({ initial, storageKey = BACKING_STORAGE_KEY }: UseBandOptions = {}) {
  const [band] = useState(() => new Band({ context: getAudioContext, destination: getOutputBus, wake: wakeAudio }, clampSettings(initial ?? {})));
  const snap = useSyncExternalStore(band.subscribe, band.getSnapshot, band.getSnapshot);

  useEffect(() => {
    if (storageKey) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) band.set(clampSettings(JSON.parse(raw)));
      } catch {
        // a broken or blocked save: keep the defaults
      }
    }
    return () => band.stop();
  }, [band, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snap.settings));
    } catch {
      // storage full or blocked: the settings simply aren't remembered
    }
  }, [snap.settings, storageKey]);

  return { band, snap };
}
