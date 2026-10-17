"use client";

import type { ReactNode } from "react";
import type { PatchNode } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { TunerMeter, TunerSettings, readHz, resolveChoice, usePitch, useTunerChoice } from "@/features/tuner";

/**
 * A tuner element of the patch: the note it hears, how many cents off, and a needle. Muted, it still listens but lets nothing through,
 * so you can tune in silence (its M button). Instrument, tuning and A4 are the tuner page's, kept per element; the detection and the
 * meter are the tuner page's too (`usePitch`, `TunerMeter`). Reads the engine's analyser for this element; opens no device: what it
 * hears is the input wired into it.
 */
export default function TunerWidget({ engine, snap, node: n, mute }: { engine: LooperEngine; snap: LooperSnapshot; node: PatchNode; mute: ReactNode }) {
  const [choice, setChoice] = useTunerChoice(`musickit.looper.tuner.${n.id}`);
  const hz = usePitch(() => engine.tunerAnalyser(n.id), resolveChoice(choice).instrument.minHz);
  const fed = snap.patch.links.some((l) => l.to === n.id);
  const read = hz !== null ? readHz(hz, choice) : null;

  return (
    <div className="flex flex-col items-center gap-2 px-3 py-2" data-patch-id={n.id}>
      <TunerSettings choice={choice} onChange={setChoice} compact trailing={mute}
        aside={n.muted && <span className="ml-auto truncate text-[10px] text-amber-200/80">Muted: tuning in silence</span>} />
      <TunerMeter size="compact" hz={hz} read={read} idle={fed ? "Play a note" : "Wire something in"} />
    </div>
  );
}
