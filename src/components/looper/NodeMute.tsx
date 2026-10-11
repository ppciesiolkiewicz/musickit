"use client";

import { ibtn } from "../controls";
import type { PatchNode } from "@/lib/looper/patch";
import type { LooperEngine } from "@/lib/looper/engine";

/** The M button of a Bus, Switch or Tuner block: the same button, in the same place (right of the block's first row), as an input's M. */
export default function NodeMute({ engine, node: n, name, title = "Mute" }: { engine: LooperEngine; node: PatchNode; name: string; title?: string }) {
  return (
    <button type="button" className={`${ibtn} shrink-0 ${n.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={n.muted} onClick={() => engine.do({ type: "patch.mute", what: "node", id: n.id, muted: !n.muted })} title={n.muted ? "Unmute" : title} aria-label={`Mute ${name}`}>M</button>
  );
}
