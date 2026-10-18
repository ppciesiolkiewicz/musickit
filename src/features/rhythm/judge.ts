/** How close to the beat a hit has to land, in seconds either side. Wider than this and the hit belongs to no note. */
export const WINDOWS = { perfect: 0.035, good: 0.07, ok: 0.12 } as const;

export type Grade = "perfect" | "good" | "ok" | "miss";

const POINTS: Record<Grade, number> = { perfect: 1, good: 0.7, ok: 0.4, miss: 0 };

export const gradeFor = (offset: number): Grade => {
  const a = Math.abs(offset);
  return a <= WINDOWS.perfect ? "perfect" : a <= WINDOWS.good ? "good" : a <= WINDOWS.ok ? "ok" : "miss";
};

/** What became of one note: its grade and, when it was hit, how early (negative) or late the hit was, in seconds. */
export interface Judged { index: number; grade: Grade; offset: number | null }

export interface Summary { perfect: number; good: number; ok: number; miss: number; extra: number; score: number; bestStreak: number; meanOffset: number | null }

/**
 * Scores a round as it is played. `hit(t)` takes a tap or strum (on the same clock as the targets) and gives the nearest note still
 * open within the ok window, or null for a hit that belongs to none (counted as extra). `expire(now)` closes the notes whose window has
 * passed unhit, as misses. Streaks count notes hit in a row; a miss ends one, an extra does not (a mic hears the odd stray noise).
 */
export function createJudge(targets: number[]) {
  const results: (Judged | null)[] = targets.map(() => null);
  let extra = 0, streak = 0, bestStreak = 0, next = 0; // next: the first note not yet expired

  const close = (j: Judged) => {
    results[j.index] = j;
    streak = j.grade === "miss" ? 0 : streak + 1;
    bestStreak = Math.max(bestStreak, streak);
    return j;
  };

  return {
    hit(t: number): Judged | null {
      let best = -1;
      for (let i = next; i < targets.length && targets[i] <= t + WINDOWS.ok; i++) {
        if (results[i] || Math.abs(t - targets[i]) > WINDOWS.ok) continue;
        if (best < 0 || Math.abs(t - targets[i]) < Math.abs(t - targets[best])) best = i;
      }
      if (best < 0) { extra++; return null; }
      const offset = t - targets[best];
      return close({ index: best, grade: gradeFor(offset), offset });
    },
    expire(now: number): Judged[] {
      const missed: Judged[] = [];
      for (; next < targets.length && targets[next] + WINDOWS.ok < now; next++) if (!results[next]) missed.push(close({ index: next, grade: "miss", offset: null }));
      return missed;
    },
    get streak() { return streak; },
    results: () => results,
    summary(): Summary {
      const done = results.filter((r): r is Judged => r !== null);
      const count = (g: Grade) => done.filter((r) => r.grade === g).length;
      const offsets = done.flatMap((r) => (r.offset === null ? [] : [r.offset]));
      return {
        perfect: count("perfect"), good: count("good"), ok: count("ok"), miss: count("miss") + (targets.length - done.length), extra,
        score: targets.length ? Math.round((100 * done.reduce((s, r) => s + POINTS[r.grade], 0)) / targets.length) : 0,
        bestStreak,
        meanOffset: offsets.length ? offsets.reduce((s, o) => s + o, 0) / offsets.length : null,
      };
    },
  };
}

export type Judge = ReturnType<typeof createJudge>;
