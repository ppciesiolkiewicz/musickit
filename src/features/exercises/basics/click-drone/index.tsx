"use client";

import dynamic from "next/dynamic";

const PracticeBand = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBand), { ssr: false, loading: () => <p className="p-3 text-sm text-slate-500">Loading…</p> });

/** A click and/or a drone on the key's root (both by default). `keyPc` is the root's pitch class. */
export function View({ bpm, keyPc, click = true, drone = true }: { bpm: number; keyPc: number; click?: boolean; drone?: boolean }) {
  const parts = [...(click ? ["click" as const] : []), ...(drone ? ["drone" as const] : [])];
  return <PracticeBand bpm={bpm} keyPc={keyPc} parts={parts} />;
}
