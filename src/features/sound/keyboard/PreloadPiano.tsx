"use client";

import { useEffect } from "react";
import { getSharedPiano } from "../playback/sequence";

/** Starts loading the piano samples as soon as a page that plays sounds opens, so the first note is not late. */
export default function PreloadPiano() {
  useEffect(() => {
    getSharedPiano();
  }, []);
  return null;
}
