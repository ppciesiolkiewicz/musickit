"use client";

import { ScalePiano } from "@/features/sound";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

/** The Scale Piano window: the shared Scale Piano keyboard, playing the looper's routed piano voice. */
export default function ScalePianoPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const sp = snap.scalePianos.find((x) => x.id === id);
  if (!sp) return null;
  return <ScalePiano state={sp} onChange={(patch) => engine.setScalePiano(id, patch)} voice={engine.getScalePiano(id)} />;
}
