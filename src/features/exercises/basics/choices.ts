import { BOOK, RUNS, type BookTune } from "@/features/theory/singingMelodies";

export interface SingerChoice { id: number; stage: string; hint: string }

/** The first tune of each stage of a book: its number, the stage title and hint. */
function firstOfStages(book: BookTune[]): SingerChoice[] {
  const out: SingerChoice[] = [];
  for (const t of book) if (!out.some((c) => c.stage === t.stage.title)) out.push({ id: t.n, stage: t.stage.title, hint: t.stage.hint });
  return out;
}

/** One melody per stage of the melody book (STAGES order), for the AI to pick a tune from. */
export const melodyChoices = (): SingerChoice[] => firstOfStages(BOOK);
/** One run per stage of the runs book (RUN_STAGES order). */
export const runChoices = (): SingerChoice[] => firstOfStages(RUNS);
/** Whether `n` is the number of a tune in the melody book (a number, not a string). */
export const isTuneId = (n: unknown): boolean => typeof n === "number" && BOOK.some((t) => t.n === n);
/** Whether `n` is the number of a run in the runs book. */
export const isRunId = (n: unknown): boolean => typeof n === "number" && RUNS.some((t) => t.n === n);
