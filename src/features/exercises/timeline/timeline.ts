import type { Timeline } from "./types";

export const BEATS_PER_BAR = 4;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export function clampTimeline(t: Timeline): Timeline {
  const bars = Math.round(clamp(t.bars, 1, 32));
  const end = bars * BEATS_PER_BAR;
  const out: Timeline = { ...t, bpm: clamp(t.bpm, 30, 240), bars, events: t.events.filter((e) => e.at < end) };
  if (t.repeats !== undefined) out.repeats = Math.round(clamp(t.repeats, 1, 50));
  return out;
}

export function timelineSeconds(t: Timeline): number {
  return ((t.bars * BEATS_PER_BAR * 60) / t.bpm) * (t.repeats ?? 1);
}
