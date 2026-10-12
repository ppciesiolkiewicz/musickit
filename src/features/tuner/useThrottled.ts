"use client";

import { useEffect, useRef, useState } from "react";

/** A tuner's refresh rate: 30 frames a second, smooth to the eye without lagging behind the string. */
export const FRAME_MS = 1000 / 30;

/** The value, changed at most once every `ms`: for text that would flicker unreadably at the frame rate. */
export function useThrottled<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  const last = useRef(0);
  useEffect(() => {
    latest.current = value;
    const wait = last.current + ms - Date.now();
    if (wait <= 0) {
      last.current = Date.now();
      setShown(value);
      return;
    }
    const id = window.setTimeout(() => { last.current = Date.now(); setShown(latest.current); }, wait);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return shown;
}
