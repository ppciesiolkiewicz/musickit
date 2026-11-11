/**
 * The breathwork drills as a list of timed phases: what to do and for how long. Pure: no React, no sound.
 * A count is one second. Every drill opens with a short "breathe out fully" so the first breath in starts empty.
 */

export const BREATH_DRILLS = ["farinelli", "sss-zzz", "zzz-sss", "cycles", "long-exhale", "body-scan"] as const;
export type BreathDrill = (typeof BREATH_DRILLS)[number];

/** What a phase asks: breathe in, hold, breathe out, rest, hiss "sss", buzz "zzz", or breathe into one part of the body. */
export type BreathKind = "ready" | "in" | "hold" | "out" | "rest" | "sss" | "zzz" | "body";

export interface Breath {
  kind: BreathKind;
  /** what the screen says, "Breathe in", "sss", "Breathe into your belly" */
  label: string;
  seconds: number;
  /** the round it belongs to, from 1; 0 for the opening "ready" */
  round: number;
  /** seconds from the start of the drill */
  at: number;
}

export interface BreathOptions {
  /** farinelli: the first count */
  from?: number;
  /** farinelli: the last count */
  to?: number;
  /** the drill's main length in seconds (see `DEFAULTS`) */
  seconds?: number;
  /** how many rounds, every drill but farinelli */
  rounds?: number;
}

export const READY_SECONDS = 3;
export const LIMITS = { from: [2, 12], to: [2, 20], seconds: [2, 16], rounds: [1, 8] } as const;
export const DEFAULTS: Record<BreathDrill, { seconds: number; rounds: number }> = {
  farinelli: { seconds: 0, rounds: 0 },
  "sss-zzz": { seconds: 3, rounds: 3 },
  "zzz-sss": { seconds: 3, rounds: 3 },
  cycles: { seconds: 4, rounds: 4 },
  "long-exhale": { seconds: 8, rounds: 4 },
  "body-scan": { seconds: 8, rounds: 2 },
};
export const FARINELLI = { from: 4, to: 8 };

export const TITLES: Record<BreathDrill, string> = {
  farinelli: "Farinelli breathing",
  "sss-zzz": "Sss-zzz",
  "zzz-sss": "Zzz-sss",
  cycles: "Breath cycles",
  "long-exhale": "Long breath out",
  "body-scan": "Body scan",
};

const BODY = ["Breathe into your belly", "Breathe into your ribs", "Breathe into your back", "Let everything soften"];

const clamp = (v: number | undefined, [lo, hi]: readonly [number, number], fb: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fb;

/** The counts a farinelli runs through, `from` up to `to` (both kept in range, `to` never under `from`). */
export function farinelliCounts(o: BreathOptions = {}): number[] {
  const from = clamp(o.from, LIMITS.from, FARINELLI.from);
  const to = Math.max(from, clamp(o.to, LIMITS.to, Math.max(from, FARINELLI.to)));
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Every phase of a drill, in order, with its start time. */
export function breathPlan(drill: BreathDrill, o: BreathOptions = {}): Breath[] {
  const d = DEFAULTS[drill];
  const s = clamp(o.seconds, LIMITS.seconds, d.seconds);
  const rounds = clamp(o.rounds, LIMITS.rounds, d.rounds);
  const out: Omit<Breath, "at">[] = [{ kind: "ready", label: "Breathe out fully", seconds: READY_SECONDS, round: 0 }];
  const each = (fn: (round: number) => Omit<Breath, "at" | "round">[]) => {
    for (let r = 1; r <= rounds; r++) out.push(...fn(r).map((b) => ({ ...b, round: r })));
  };
  const IN = (seconds: number) => ({ kind: "in" as const, label: "Breathe in", seconds });
  switch (drill) {
    case "farinelli":
      farinelliCounts(o).forEach((n, i) =>
        out.push(
          { ...IN(n), round: i + 1 },
          { kind: "hold", label: "Hold", seconds: n, round: i + 1 },
          { kind: "out", label: "Breathe out", seconds: n, round: i + 1 },
        ),
      );
      break;
    case "sss-zzz":
      each(() => [{ kind: "sss", label: "sss", seconds: s }, { kind: "zzz", label: "zzz", seconds: s }, { kind: "sss", label: "sss", seconds: s }, IN(2)]);
      break;
    case "zzz-sss":
      each(() => [{ kind: "zzz", label: "zzz", seconds: s }, { kind: "sss", label: "sss", seconds: s }, { kind: "zzz", label: "zzz", seconds: s }, IN(2)]);
      break;
    case "cycles":
      each(() => [IN(s), { kind: "hold", label: "Hold", seconds: s }, { kind: "out", label: "Breathe out", seconds: s }, { kind: "rest", label: "Rest", seconds: 2 }]);
      break;
    case "long-exhale":
      each(() => [IN(4), { kind: "out", label: "Breathe out slowly", seconds: s }]);
      break;
    case "body-scan":
      each(() => BODY.map((label) => ({ kind: "body" as const, label, seconds: s })));
      break;
  }
  let at = 0;
  return out.map((b) => {
    const placed = { ...b, at };
    at += b.seconds;
    return placed;
  });
}

export const totalSeconds = (plan: Breath[]) => plan.reduce((t, b) => t + b.seconds, 0);

/** The phase playing `t` seconds in (null before the start and after the end), and how far through it is, 0 to 1. */
export function phaseAt(plan: Breath[], t: number): { index: number; progress: number } | null {
  if (t < 0) return null;
  for (let i = 0; i < plan.length; i++) {
    const b = plan[i];
    if (t < b.at + b.seconds) return { index: i, progress: (t - b.at) / b.seconds };
  }
  return null;
}

/**
 * How full the lungs are at a phase's `progress`, 0 (empty) to 1 (full), for the breathing circle: it grows while
 * breathing in, stays while holding, shrinks while breathing out; a hissed or buzzed sound lets air out slowly.
 */
export function fullness(plan: Breath[], index: number, progress: number): number {
  const b = plan[index];
  const before = index > 0 ? fullness(plan, index - 1, 1) : 0.15;
  switch (b.kind) {
    case "ready": return 0.6 - 0.45 * progress;
    case "in": return before + (1 - before) * progress;
    case "hold": return before;
    case "out": return before - (before - 0.15) * progress;
    case "rest": return 0.15;
    case "sss":
    case "zzz": return before - Math.min(before - 0.15, 0.3) * progress;
    case "body": return 0.55 + 0.25 * Math.sin(progress * Math.PI);
  }
}
