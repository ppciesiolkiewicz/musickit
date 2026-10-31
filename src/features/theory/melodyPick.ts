/**
 * Choosing a tune from a book by what the AI asks for (a difficulty and a stage) instead of a number,
 * so it never has to see the whole book.
 */
import { DIFFICULTIES, type BookTune, type Stage } from "./singingMelodies";

export interface MelodyPick {
  /** a DIFFICULTIES title, any case: "easy" */
  difficulty?: string;
  /** a stage id */
  stage?: string;
  /** which of the matching tunes, from 0; wraps round */
  index?: number;
}

/** The tune a pick names: `exact` is false when the stage or the difficulty had to be relaxed. Null only for an empty book. */
export function pickTune(book: BookTune[], pick: MelodyPick): { n: number; exact: boolean } | null {
  if (!book.length) return null;
  const d = DIFFICULTIES.findIndex((x) => x.title.toLowerCase() === pick.difficulty?.trim().toLowerCase());
  const at = (pool: BookTune[]) => pool[(Math.trunc(pick.index ?? 0) % pool.length + pool.length) % pool.length].n;
  const inStage = (t: BookTune) => pick.stage === undefined || t.stage.id === pick.stage;
  const exact = book.filter((t) => (pick.difficulty === undefined || t.difficulty === d) && inStage(t));
  if (exact.length) return { n: at(exact), exact: true };
  // relax the stage first: the same difficulty in any stage
  const anyStage = d >= 0 ? book.filter((t) => t.difficulty === d) : [];
  if (anyStage.length) return { n: at(anyStage), exact: false };
  // then the nearest difficulty, preferring the stage
  const target = Math.max(d, 0);
  const near = (pool: BookTune[]) => {
    const best = Math.min(...pool.map((t) => Math.abs(t.difficulty - target)));
    return pool.filter((t) => Math.abs(t.difficulty - target) === best);
  };
  const preferred = near(book.filter(inStage));
  const pool = book.filter(inStage).length ? preferred : near(book);
  return { n: at(pool), exact: false };
}

/** What a pick may name, for the prompt. */
export const pickChoices = (stages: Stage[]): string =>
  `difficulties: ${DIFFICULTIES.map((d) => d.title.toLowerCase()).join(", ")}; stages: ${stages.map((s) => `${s.id} (${s.title})`).join(", ")}`;
