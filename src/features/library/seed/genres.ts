/** The genres a seed block may belong to (`genre` in its file): a block of a genre is a dead end on the path, hung off the steps it uses, and no step waits for it. */
export const GENRES = ["blues", "rock", "funk", "jazz"] as const;
export type Genre = (typeof GENRES)[number];
export const isGenre = (v: unknown): v is Genre => GENRES.includes(v as Genre);
