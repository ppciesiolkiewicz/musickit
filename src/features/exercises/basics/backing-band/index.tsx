"use client";

import dynamic from "next/dynamic";
import type { BandPart, BandParts } from "@/features/plan/model/tools";
import { BAND_PARTS } from "@/features/plan/model/tools";
import { useLevelAtLeast } from "@/features/guide/Tier";

const PracticeBand = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBand), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

const having = (parts: BandParts, ...modes: string[]): BandPart[] => BAND_PARTS.filter((p) => parts[p] && modes.includes(parts[p]));

/** The practice band with the parts offered, lit and locked as `parts` says. `keyPc` is the root's pitch class. The band's "More" fold is a Standard control. */
export function View({ bpm, keyPc, parts }: { bpm: number; keyPc: number; parts: BandParts }) {
  const more = useLevelAtLeast("standard");
  const config = { parts: having(parts, "on", "off", "always"), start: having(parts, "on", "always"), locked: having(parts, "always"), bpm, keyPc, show: { more } };
  return <PracticeBand view="bar" storageKey="musickit.practiceBand" config={config} />;
}
