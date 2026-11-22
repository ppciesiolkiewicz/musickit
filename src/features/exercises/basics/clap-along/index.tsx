"use client";

import dynamic from "next/dynamic";
import type { RhythmInput } from "@/features/rhythm/RhythmGame";

const RhythmGame = dynamic(() => import("@/features/rhythm/RhythmGame"), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

/**
 * The rhythm game (`src/features/rhythm`) as an exercise draws it: the rhythm, the tempo and the bars are the
 * exercise's, with no picker and no setup panel. The tour's targets (`rhythm-start`, `rhythm-lane`, `rhythm-input`,
 * `rhythm-tempo`) are in `RhythmGame.tsx`.
 */
export function View({ pattern, bpm, bars, input }: { pattern: string; bpm: number; bars?: number; input?: RhythmInput }) {
  return <RhythmGame bare pattern={pattern} bpm={bpm} bars={bars} input={input} />;
}
