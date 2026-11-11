import type { Area } from "./concepts";
import type { Level } from "./types";
import { EXERCISE_AREAS, EXERCISE_LEVELS, EXERCISE_TAGS } from "./tools";

/**
 * Hashtags at the end of a title stand for the exercise's area, level and kind tags: "Barre drill #guitar #beginner
 * #technique". Both doors write them: a teacher types them in the title, the AI may write them or the fields. The title
 * is stored without them and the page shows them after it, small.
 */

/** A title read: the words, and the tags found at its end (an unknown hashtag is listed, not kept). */
export interface TitleTags { title: string; area?: Area; level?: Level; tags: string[]; unknown: string[] }

/** A trailing hashtag: a word of letters and dashes after a space (a `#` before a digit is text, "position #1"; a `#` after a letter is a sharp, "C#m"). */
const TRAILING = /(?:^|\s+)#([a-z][a-z-]*)$/i;

/** The title's trailing hashtags read into fields, in order of appearance; the title trimmed of them, keeping its first hashtag's word when nothing else is left. */
export function readTitle(raw: string): TitleTags {
  let title = raw.trim();
  const words: string[] = [];
  for (let m = title.match(TRAILING); m; m = title.match(TRAILING)) {
    words.unshift(m[1].toLowerCase());
    title = title.slice(0, m.index).trim();
  }
  const out: TitleTags = { title: title || words[0] || raw.trim(), tags: [], unknown: [] };
  for (const w of words) {
    if ((EXERCISE_AREAS as string[]).includes(w)) out.area = w as Area;
    else if ((EXERCISE_LEVELS as string[]).includes(w)) out.level = w as Level;
    else if (Object.hasOwn(EXERCISE_TAGS, w)) { if (!out.tags.includes(w)) out.tags.push(w); }
    else out.unknown.push(w);
  }
  return out;
}

/** "#guitar #beginner #technique": the area, the level, then the kind tags; "" when the exercise has none. */
export const hashtagLine = (meta: { area?: Area; level?: Level; tags?: string[] }): string =>
  [meta.area, meta.level, ...(meta.tags ?? [])].filter(Boolean).map((t) => `#${t}`).join(" ");
