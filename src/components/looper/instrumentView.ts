import { allInstrumentOptions } from "@/features/sound";
import type { IconName } from "../Icon";
import type { LooperSnapshot } from "@/lib/looper/engine";
import type { Controller } from "@/lib/looper/instrumentModel";

export type Inst = LooperSnapshot["instruments"][number];

export const CONTROLLER_ICON: Record<Controller, IconName> = { piano: "piano", scalepiano: "music", soundboard: "layout-dashboard" };

/** What the instrument plays now: "Cello". */
export function generatorDetail(inst: Inst): string {
  const g = inst.generator;
  return allInstrumentOptions().find((o) => o.value === g.instrument)?.label ?? g.instrument;
}
