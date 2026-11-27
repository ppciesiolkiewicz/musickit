import type { MelodyNote } from "@/lib/chordKit/tab";
import type { ArticleBlock } from "@/features/articles/model";
import type { LabelSystem } from "@/features/theory/labels";
import { OPEN_PCS, type Visual } from "./visuals";

/**
 * The position course: stages made of sections, each section one page made of blocks.
 * Pure data, so pages stay server components and the shapes, paths and links can be tested.
 */

/** Songs are listed by title and chords only; melodies in tab are traditional or public-domain tunes. */
export interface CourseLink { href: string; label: string; note?: string }
export interface Song { title: string; artist: string; chords: string[]; progression: string; note?: string }
export interface Melody { title: string; origin: string; position: number; notes: MelodyNote[] }

/** What a section is mainly about. The course index can group sections by it, in this order. */
export type TopicId =
  | "basics" | "open-chords" | "strumming" | "three-views" | "melody" | "caged"
  | "triads" | "fifths" | "arpeggios" | "paths" | "soloing" | "barre-drop3" | "colour" | "modes" | "keys" | "technique";

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: "basics", label: "Guitar basics" },
  { id: "open-chords", label: "Open chords" },
  { id: "strumming", label: "Strumming" },
  { id: "technique", label: "Technique & dexterity" },
  { id: "three-views", label: "Piano, guitar & solfège" },
  { id: "melody", label: "Melodies" },
  { id: "caged", label: "CAGED positions" },
  { id: "triads", label: "Triads" },
  { id: "fifths", label: "5ths & double stops" },
  { id: "arpeggios", label: "Arpeggios" },
  { id: "paths", label: "Paths & the circle of fifths" },
  { id: "soloing", label: "Scales & soloing" },
  { id: "barre-drop3", label: "Barres & drop 3" },
  { id: "colour", label: "Colour chords" },
  { id: "modes", label: "Modes" },
  { id: "keys", label: "Other keys" },
];

export type StrumPatternId = "downs-quarter" | "downs-eighth" | "island" | "sixteenths";

export type Block =
  | { kind: "text"; paras: string[] }
  | { kind: "visual"; visual: Visual }
  | { kind: "strum"; pattern: StrumPatternId; chords: string[]; caption: string }
  | { kind: "links"; explore: CourseLink[]; practise: CourseLink[] }
  | { kind: "songs"; songs: Song[] }
  | { kind: "melody"; melody: Melody }
  /** a practice task, or how to tell you're ready to move on */
  | { kind: "task"; text: string };

export interface CourseSection {
  slug: string;
  title: string;
  /** a few words for narrow places (the AI plan's "Learn before" links on a phone); the title when that is short already */
  short: string;
  topic: TopicId;
  /** what the section teaches, or will teach, in a sentence or two: shown on planned sections, and to the AI plan's link list */
  about: string;
  blocks: Block[];
  /** the section written in the /learn articles' style (live tools, exercises), drawn in place of `blocks`, which stay empty */
  article?: CourseArticle;
}

/**
 * A course section written as a /learn article is: `ArticleBlock`s drawn by the articles' `ArticleBody`, with the plan's live
 * tools. `updated` carries the time as well as the day, "2026-11-27T14:30" (Sydney time), so a section written to an
 * older /learn style can be found and rewritten.
 */
export interface CourseArticle {
  updated: string;
  blocks: ArticleBlock[];
  /** the page listens to the mic: the mic note and the Your voice picker */
  sings?: boolean;
  /** what the dots start as; absent: Solfège when it `sings`, else Intervals */
  labels?: LabelSystem;
  /** every guitar neck on the page ends by this fret */
  frets?: number;
}

/** A section with something written in it, as course blocks or as an article; any other is planned. */
export const isWritten = (s: CourseSection): boolean => s.blocks.length > 0 || !!s.article;
export interface CourseStage {
  slug: string;
  /** how the stage is numbered on the page: "0.2", "1" */
  label: string;
  title: string;
  intro: string;
  sections: CourseSection[];
}

/** Pitch class of a fretted note, string 0 = low E. */
export const pcAt = (string: number, fret: number): number => (OPEN_PCS[string] + fret) % 12;

/**
 * A section with no blocks and no article is planned: its `about` says what it will teach until the content files fill it in.
 * The content is course `blocks`, or a `CourseArticle` in the /learn style. A long title comes with its short form, `[title, short]`.
 */
export const section = (slug: string, title: string | [string, string], topic: TopicId, about: string, content: Block[] | CourseArticle = []): CourseSection => {
  const [full, short] = typeof title === "string" ? [title, title] : title;
  return Array.isArray(content) ? { slug, title: full, short, topic, about, blocks: content } : { slug, title: full, short, topic, about, blocks: [], article: content };
};
