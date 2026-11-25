import { doneKey } from "./schedule";
import type { DayTime } from "./planTime";
import type { StoredPlan } from "./types";

/**
 * When `/plan` asks the player to rate: under `SHARE` of the exercises they practised on their past days are rated, once
 * there are at least `MIN` of them to count. An exercise counts as practised when it is rated or the day timer ran while
 * it was the card in view (`DayTime.spent`); one never opened doesn't count against the player.
 */
export const RATING_NUDGE = { SHARE: 0.5, MIN: 4 };

/** How many exercises of `days` were practised, and how many of those are rated. */
export function ratedShare(days: StoredPlan[], times: DayTime[]): { practised: number; rated: number } {
  let practised = 0, rated = 0;
  for (const p of days) {
    p.config.days.forEach((d, di) => {
      const t = times.find((x) => x.planId === p.id && x.day === di);
      d.exercises.forEach((e, ei) => {
        const isRated = !!p.rated?.[doneKey(di, ei)];
        if (!isRated && !(e.id && (t?.spent[e.id] ?? 0) > 0)) return;
        practised++;
        if (isRated) rated++;
      });
    });
  }
  return { practised, rated };
}

/** The counts to show when the player should be asked to rate, or null. */
export function ratingNudge(days: StoredPlan[], times: DayTime[]): { practised: number; rated: number } | null {
  const s = ratedShare(days, times);
  return s.practised >= RATING_NUDGE.MIN && s.rated < s.practised * RATING_NUDGE.SHARE ? s : null;
}
