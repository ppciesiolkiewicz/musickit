import { allInstrumentOptions } from "@/features/sound";
import type { IconName } from "../Icon";
import type { LooperSnapshot } from "@/lib/looper/engine";
import type { Controller } from "@/lib/looper/instrumentModel";

export type Inst = LooperSnapshot["instruments"][number];

export const CONTROLLER_ICON: Record<Controller, IconName> = { piano: "piano", scalepiano: "music", soundboard: "layout-dashboard" };

/** The sound generators, as people see them. */
export const GENERATOR_NAMES = { piano: "Built-in instruments", sampler: "ElevenLabs sampler" } as const;

/** What the generator plays now: "Cello", "Glass hit", "5 pads", "no sample". `names` maps sample ids to names. */
export function generatorDetail(inst: Inst, names: Record<string, string> = {}): string {
  const g = inst.generator;
  if (g.kind === "piano") return allInstrumentOptions().find((o) => o.value === g.instrument)?.label ?? g.instrument;
  if (inst.controller === "soundboard") {
    const n = g.padSamples.filter(Boolean).length;
    return `${n} pad${n === 1 ? "" : "s"}`;
  }
  return g.sample ? names[g.sample] ?? "missing sample" : "no sample";
}

/** Which pads (Soundboard) point at a sample the library no longer has. */
export function missingIn(inst: Inst, have: Set<string>): boolean[] {
  const g = inst.generator;
  return g.kind === "sampler" ? g.padSamples.map((s) => !!s && !have.has(s)) : Array.from({ length: inst.pads }, () => false);
}

/** True when what this instrument plays needs a sample the library no longer has. */
export function instrumentMissing(inst: Inst, have: Set<string>): boolean {
  const g = inst.generator;
  if (g.kind !== "sampler") return false;
  return inst.controller === "soundboard" ? missingIn(inst, have).some(Boolean) : !!g.sample && !have.has(g.sample);
}
