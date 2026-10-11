import { allInstrumentOptions } from "@/features/sound";
import type { IconName } from "../Icon";
import type { LooperSnapshot } from "@/lib/looper/engine";
import type { Controller } from "@/lib/looper/instrumentModel";

export type Inst = LooperSnapshot["instruments"][number];

export const CONTROLLER_ICON: Record<Controller, IconName> = { piano: "piano", scalepiano: "music", soundboard: "layout-dashboard" };

/** "Piano · Cello", "Sampler · Glass hit", "Sampler · 5 pads". `names` maps sample ids to names. */
export function generatorChip(inst: Inst, names: Record<string, string> = {}): string {
  const g = inst.generator;
  if (g.kind === "piano") return `Piano · ${allInstrumentOptions().find((o) => o.value === g.instrument)?.label ?? g.instrument}`;
  if (inst.controller === "soundboard") {
    const n = g.padSamples.filter(Boolean).length;
    return `Sampler · ${n} pad${n === 1 ? "" : "s"}`;
  }
  return `Sampler · ${g.sample ? names[g.sample] ?? "missing sample" : "no sample"}`;
}
