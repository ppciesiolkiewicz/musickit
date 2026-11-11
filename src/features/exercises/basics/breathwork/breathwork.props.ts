/**
 * A breathing exercise for singers, no mic and no instrument: a circle that grows as the student breathes in, stays
 * while they hold and shrinks as they breathe out, the count ticking in the middle, a soft tick on each count and a
 * chime when the phase changes (no spoken voice). A strip under it shows every phase to come. Drills: "farinelli"
 * (breathe in, hold and breathe out for the same count, one count more each cycle), "sss-zzz" and "zzz-sss" (a hiss,
 * then the same with voice, to feel where the voice starts), "cycles" (in, hold, out, rest), "long-exhale" (in for 4,
 * out slowly for longer) and "body-scan" (breathe into the belly, the ribs, the back).
 * @component breathwork basic
 */
export interface BreathworkProps {
  /** farinelli only: how hard, in one word; it sets `from` and `to` where you leave them out: "new" 2 to 5, "beginner" 3 to 8, "intermediate" 4 to 10, "advanced" 4 to 20 */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** "farinelli" (default), "sss-zzz", "zzz-sss", "cycles", "long-exhale" or "body-scan" */
  drill?: "farinelli" | "sss-zzz" | "zzz-sss" | "cycles" | "long-exhale" | "body-scan";
  /** farinelli only: the first count, 2-12; default 4 (a beginner 2 or 3) */
  from?: number;
  /** farinelli only: the last count, from `from` up to 20; default 8 (a beginner 8, intermediate 10, advanced 20). Each count is one second, so 4 to 8 takes about 1.5 minutes */
  to?: number;
  /** the drill's main length in seconds, 2-16: each sss and zzz (default 3), each in, hold and out of "cycles" (default 4), the breath out of "long-exhale" (default 8, the breath in is always 4), each part of "body-scan" (default 8). Not for farinelli */
  seconds?: number;
  /** rounds, 1-8: sss-zzz and zzz-sss default 3, cycles and long-exhale 4, body-scan 2. Not for farinelli */
  rounds?: number;
}
