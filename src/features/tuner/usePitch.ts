"use client";

import { useEffect, useRef, useState } from "react";
import { FRAME_MS, createSmoother } from "./pitch";
import { createDetector } from "./detector";

/**
 * The pitch heard on an analyser, in Hz (smoothed over the last few readings), or null when nothing clear is playing. Measures about
 * 30 times a second while `active`. `getAnalyser` is asked every frame (the looper's analyser can come and go; the page's appears
 * after Start), and `minHz` is the lowest note to look for (the instrument's). Shared by the tuner page and the looper's tuner.
 */
export function usePitch(getAnalyser: () => AnalyserNode | null, minHz: number, active = true): number | null {
  const [hz, setHz] = useState<number | null>(null);
  // the loop reads these without restarting
  const get = useRef(getAnalyser);
  const lowest = useRef(minHz);
  useEffect(() => {
    get.current = getAnalyser;
    lowest.current = minHz;
  });

  useEffect(() => {
    if (!active) return;
    const detect = createDetector();
    const smooth = createSmoother();
    let quiet = 0, alive = true;
    let buf: Float32Array<ArrayBuffer> | null = null;
    const id = window.setInterval(() => {
      const an = get.current();
      if (!an) return;
      if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      void detect(buf, an.context.sampleRate, lowest.current).then((p) => {
        if (!alive || p === undefined) return;
        if (p) {
          quiet = 0;
          setHz(smooth.push(p));
        } else if (++quiet > 15) { smooth.reset(); setHz(null); }
      });
    }, FRAME_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
      setHz(null);
    };
  }, [active]);

  return active ? hz : null;
}
