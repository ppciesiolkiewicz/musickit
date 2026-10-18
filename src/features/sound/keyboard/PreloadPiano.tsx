"use client";

import { useEffect } from "react";
import { getSharedPiano } from "../playback/sequence";

/** Starts loading the piano samples once a page that plays sounds is idle, so the first note is not late
 *  and the samples don't compete with the page's own scripts while it loads. */
export default function PreloadPiano() {
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => getSharedPiano(), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => getSharedPiano(), 1000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
