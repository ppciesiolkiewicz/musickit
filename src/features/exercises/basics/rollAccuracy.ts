/**
 * How close a lip roll has to be to the tone's line to count as on it, in cents: wider than a sung note's (`ACCURACIES`),
 * since a lip roll buzzes and wobbles. Plain data, so the stored "records" document (`features/userData/model.ts`) keeps
 * only these values.
 */
export const ROLL_ACCURACIES = [
  { title: "Easy", cents: 150 },
  { title: "Medium", cents: 100 },
  { title: "Hard", cents: 50 },
  { title: "Pro", cents: 25 },
] as const;

/** The accuracy before the player picks one: Easy. */
export const DEFAULT_ROLL_CENTS: number = ROLL_ACCURACIES[0].cents;

export const isRollCents = (v: unknown): v is number => ROLL_ACCURACIES.some((a) => a.cents === v);
