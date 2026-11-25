"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * A tool's beat, told to whoever listens: the content videos' record page, which saves it with a take so the tool can be
 * drawn over the video in step with the hands (`contentVideos/model/clock.ts`). A tool that can be drawn over a video
 * calls `useToolClock` with its beat (null while stopped); with no listener it does nothing.
 */
const ToolClock = createContext<((beat: number | null) => void) | null>(null);

/** Listens to the beat of every tool under it. `onBeat` is called on each change, so keep it cheap (store it in a ref). */
export function ToolClockListener({ onBeat, children }: { onBeat: (beat: number | null) => void; children: ReactNode }) {
  return <ToolClock.Provider value={onBeat}>{children}</ToolClock.Provider>;
}

/** Tells the listener, if any, this tool's beat: the riff's beat counting on through its loops, the tune's beat in the tune; null when stopped. */
export function useToolClock(beat: number | null) {
  const tell = useContext(ToolClock);
  useEffect(() => { tell?.(beat); }, [tell, beat]);
  useEffect(() => () => tell?.(null), [tell]);
}
