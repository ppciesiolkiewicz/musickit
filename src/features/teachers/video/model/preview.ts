/**
 * What the studio's video preview shows under the frame: where each tune starts, the time, and where in the video it is.
 * Pure functions of the score.
 */
import { FPS } from "./config";
import { momentAt, type Score } from "./score";

/** each tune's first countdown beat, in ms from the start: the slider's marks */
export const tuneStarts = (s: Score): number[] => s.segments.map((g) => s.introMs + g.startBeat * s.beatMs);

/** the frame showing at `ms` */
export const frameAt = (ms: number): number => Math.floor((ms * FPS) / 1000);

/** `ms` as m:ss.t (83 456 → "1:23.4") */
export function formatMs(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths % 10}`;
}

/** where the video is at `ms`, in words: "Intro", "Tune 2 · count-in", "Tune 2 · pass 3 of 4", "End" */
export function momentLabel(s: Score, ms: number): string {
  const m = momentAt(s, ms);
  if (m.phase === "intro") return "Intro";
  if (m.phase === "end") return "End";
  const tune = `Tune ${m.segment + 1}`;
  return m.phase === "countdown" ? `${tune} · count-in` : `${tune} · pass ${m.pass} of ${s.segments[m.segment].times}`;
}
