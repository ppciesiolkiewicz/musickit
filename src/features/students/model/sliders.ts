/**
 * The sliders on a student's page, pure: the scale (0 New to 3 Advanced, a tenth at a time, the `outcome()` topic score),
 * a score in words, and which sliders the teacher moved. Only a moved slider is sent: the server records a teacher's
 * score for every topic it is sent, and that score holds the topic from then on.
 */

/** The four levels under the scale, at 0, 1, 2 and 3. */
export const LEVEL_MARKS = ["New", "Beginner", "Intermediate", "Advanced"] as const;

/** A slider moves a tenth of a level at a time. */
export const STEP = 0.1;

/** A score as the slider shows it: 0 to 3, at a tenth. */
export const tenth = (score: number): number => Math.min(3, Math.max(0, Math.round(score * 10) / 10));

/** The topics whose value differs from where its slider opened by half a step or more, at a tenth; a topic with no start counts as moved. */
export function moved(start: Record<string, number>, now: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [topic, value] of Object.entries(now)) {
    const from = start[topic];
    if (from === undefined || Math.abs(value - from) >= STEP / 2) out[topic] = tenth(value);
  }
  return out;
}

/** A score in words: "Beginner", or "Beginner, 40% to Intermediate" between two levels. */
export function levelWord(score: number): string {
  const s = tenth(score);
  const level = Math.floor(s);
  const part = Math.round((s - level) * 100);
  return level >= 3 || part === 0 ? LEVEL_MARKS[level] : `${LEVEL_MARKS[level]}, ${part}% to ${LEVEL_MARKS[level + 1]}`;
}
