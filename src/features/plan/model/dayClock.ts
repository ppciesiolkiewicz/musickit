/** Where a day's countdown stands: the whole day's time, what's left, and which exercise that time falls in. */
export interface DayClock {
  /** the day's seconds: every exercise's minutes */
  total: number;
  left: number;
  /** the exercise the elapsed time falls in, null once the day's time is up */
  exercise: number | null;
  /** seconds left in that exercise */
  leftInExercise: number;
}

/** The day's clock after `elapsed` seconds, the exercises laid end to end in order. */
export function dayClock(minutes: number[], elapsed: number): DayClock {
  const total = minutes.reduce((n, m) => n + m * 60, 0);
  const at = Math.min(Math.max(0, Math.floor(elapsed)), total);
  let end = 0;
  for (let i = 0; i < minutes.length; i++) {
    end += minutes[i] * 60;
    if (at < end) return { total, left: total - at, exercise: i, leftInExercise: end - at };
  }
  return { total, left: 0, exercise: null, leftInExercise: 0 };
}

/** The stored seconds of a day, made safe: a whole number of seconds, never below 0. */
export const elapsedOf = (elapsed: Record<string, number> | undefined, day: number): number => {
  const v = elapsed?.[String(day)];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
};
