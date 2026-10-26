"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMicPitch, type MicStatus } from "@/components/practice/useMicPitch";
import { createSmoother, type Pitch } from "@/features/tuner";
import { activeSource, type AudioInputSetup } from "../model/audioInput";

/** silent readings in a row (about half a second) before the meter lets go of the last note */
const QUIET_FRAMES = 30;

/**
 * Listen to the audio input's chosen source (its device and channel) while `enabled`: the pitch class held steady (what the widgets
 * light) and the pitch heard now, smoothed like the tuner's, for the accuracy meter. The host calls it, so the input outlives its widget.
 */
export function useAudioInput(enabled: boolean, setup: AudioInputSetup): { status: MicStatus; heard: number | null; hz: number | null } {
  const [hz, setHz] = useState<number | null>(null);
  const smooth = useRef(createSmoother());
  const quiet = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (p) {
      quiet.current = 0;
      setHz(smooth.current.push(p));
    } else if (++quiet.current > QUIET_FRAMES) {
      smooth.current.reset();
      setHz(null);
    }
  }, []);
  const src = activeSource(setup);
  const { status, heard } = useMicPitch(enabled, undefined, onPitch, { deviceId: src.device?.id ?? null, channel: src.channel });
  // another source or a stop starts the meter afresh
  useEffect(() => {
    smooth.current.reset();
    quiet.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the meter clears when what it listens to changes
    setHz(null);
  }, [enabled, setup.source, src.device?.id, src.channel]);
  return { status, heard, hz: enabled ? hz : null };
}
