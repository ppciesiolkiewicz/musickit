"use client";

import { useEffect } from "react";
import { whenIdleAfterLoad } from "../engine/preload";
import { getSharedPiano } from "../playback/sequence";

/** Starts loading the piano (its samples and Tone.js) once the page has loaded and is idle, so the first note is not late
 *  and the samples don't compete with the page's own loading. */
export default function PreloadPiano() {
  useEffect(() => {
    let live = true;
    whenIdleAfterLoad(window as never, () => {
      if (live) getSharedPiano();
    });
    return () => {
      live = false;
    };
  }, []);
  return null;
}
