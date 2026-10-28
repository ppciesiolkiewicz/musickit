import type { MelodyNote } from "@/lib/chordKit/tab";
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
  | "triads" | "fifths" | "arpeggios" | "paths" | "soloing" | "barre-drop3" | "colour" | "modes" | "keys";

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: "basics", label: "Guitar basics" },
  { id: "open-chords", label: "Open chords" },
  { id: "strumming", label: "Strumming" },
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

export interface CourseSection { slug: string; title: string; topic: TopicId; blocks: Block[] }
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

/** A section with no content yet: the content files fill `blocks` in. */
export const section = (slug: string, title: string, topic: TopicId, blocks: Block[] = []): CourseSection => ({ slug, title, topic, blocks });
