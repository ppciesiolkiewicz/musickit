"use client";

import dynamic from "next/dynamic";
import type { BandPart } from "@/features/plan/model/tools";

const PracticeBand = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBand), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

/** The practice band with the chosen parts. `keyPc` is the root's pitch class. */
export function View({ bpm, keyPc, parts }: { bpm: number; keyPc: number; parts: BandPart[] }) {
  return <PracticeBand bpm={bpm} keyPc={keyPc} parts={parts} />;
}
