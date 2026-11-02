"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { takeAudioFocus } from "./focus";

/**
 * One source plays at a time: while `playing`, this source holds the audio focus (`takeAudioFocus`), so starting it stops
 * any other, and another starting calls `stop`. It also stops when its element (the returned ref) leaves the screen:
 * scrolled away or hidden. Unmounting releases the focus; the host stops its own sound on unmount.
 */
export function useAudioFocus(playing: boolean, stop: () => void): (el: HTMLElement | null) => void {
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => (playing ? takeAudioFocus(() => stopRef.current()) : undefined), [playing]);
  useEffect(() => {
    if (!playing || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) stopRef.current();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [playing, el]);

  return useCallback((node: HTMLElement | null) => setEl(node), []);
}
