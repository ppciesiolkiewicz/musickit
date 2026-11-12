"use client";

import { useEffect } from "react";
import { preloadPitchModel } from "@/features/sound/engine/preload";

/** Mounted once in the root layout: warms the pitch model after the page has loaded (the piano: `PreloadPiano`). Renders nothing. */
export default function SoundPreload() {
  useEffect(() => preloadPitchModel(), []);
  return null;
}
