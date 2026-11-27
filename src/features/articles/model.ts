import type { LabelSystem } from "@/features/theory/labels";

/** The version of `VOICE.md`, the articles' voice; a seed file records the one it was written to. */
export const ARTICLE_VOICE_VERSION = 4;

/**
 * One block of a public article. Text takes two inline marks: `**bold**` and `[label](href)` links (one to another `/learn` guide opens in place, any other in a new tab), and notes written as plan
 * text writes them (`{{1}}`, `{{b7}}`, `{{a}}`), drawn as the neck's dots and counted from the key of the nearest exercise's
 * tool (`blockRoots`). A `care` block is the
 * one line that keeps a reader from hurting their voice, drawn as the plan's care line.
 */
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "care"; text: string }
  /** the sing-along player's controls (view, sounds, loop, full screen, Accuracy), each drawn inline: said once, by `ui/PlayerControls.tsx` */
  | { type: "player" }
  /** a photo from `public/images/learn`, its caption and the credit its licence asks for (author, licence, the source page) */
  | { type: "figure"; src: string; width: number; height: number; alt: string; caption: string; credit: { by: string; license: string; licenseUrl: string; source: string } }
  /**
   * something to sing on the page: a heading, its lines (one paragraph each) and the tool, written as a seed exercise writes it
   * (`parseTool` reads it). `beside`: a second tool drawn under it, for two scales compared on the same neck, with `between`, lines
   * between the two
   */
  | { type: "exercise"; title: string; lines: string[]; tool: Record<string, unknown>; beside?: Record<string, unknown>; between?: string[]; after?: string[]; parts?: ExercisePart[] }
  /**
   * every note from Do on a piano, each key with its solfège name and its interval under it; tap a key to hear it
   * (`ui/NamesChart.tsx`). One octave unless `octaves` says more: then the names come round again from each Do, and no table.
   */
  | { type: "names"; octaves?: number; /** "guitar": the same names on a guitar neck, frets 0 to 12 from C (`ui/NamesNeck.tsx`), not a piano */ on?: "guitar" }
  /** another guide as its /learn card, in the text where the reader may need it first (`Block` in `ui/ArticleView.tsx`), after `text`, the line that says why */
  | { type: "guide"; slug: string; text: string }
  /** small tools side by side (two to a row on a wide screen, one under the other on a phone), with no text: a row of charts */
  | { type: "row"; tools: Record<string, unknown>[] }
  /** a search box: type a major or minor barre chord, see easier chords for it as chord boxes (`ui/ChordFinder.tsx`, `alternatives.ts`) */
  | { type: "chord-finder" };

/**
 * A smaller step at the end of an exercise, under its own subheading: the same shape moved to another chord ("Move it: B7 to
 * C7"), its lines, and the tool that shows it.
 */
export interface ExercisePart { title: string; lines: string[]; tool?: Record<string, unknown> }

/** What an article's dots start as: its own `labels`, else Intervals for a guitar article and Solfège for any other (singing). */
export const articleLabels = (a: Pick<Article, "labels" | "topics">): LabelSystem => a.labels ?? (a.topics.includes("guitar") ? "interval" : "solfege");

/** The article with every solfège name and interval on a piano, which the Labels switch links to. */
export const NAMES_ARTICLE = "intervals-and-solfege";

/** The topics an article is tagged with, in the order /learn's filter shows them, with the word on the screen. */
export const TOPICS = { singing: "Singing", guitar: "Guitar", theory: "Theory" } as const;
export type Topic = keyof typeof TOPICS;

/** A public article at /learn/<slug>, written for one search (NEW21). */
export interface Article {
  slug: string;
  /** the page's heading */
  title: string;
  /** the browser tab and search result title */
  metaTitle: string;
  /** the search result's description, under 160 characters */
  description: string;
  /** the line under the title */
  intro: string;
  /** the day it was written or last rewritten, YYYY-MM-DD */
  updated: string;
  /** the page listens to the mic: shows the mic and headphones note and the Your voice picker */
  sings: boolean;
  /** what it is about, shown as tags on its /learn card and used by the topic filter there; one or more */
  topics: Topic[];
  /**
   * what every dot on the page, on the necks, staffs and in the text, is labelled as when the page opens; the Labels selector at
   * the bottom of the page (`ui/ArticleLabels.tsx`) switches it. Absent: `articleLabels`, Intervals for a guitar article, else Solfège
   */
  labels?: LabelSystem;
  /** every guitar neck on the page ends by this fret; absent: the tools' own */
  frets?: number;
  blocks: ArticleBlock[];
}

/**
 * What an article was written from, kept beside it in `seeds/<slug>.json`, so it can be checked or rewritten to newer rules
 * the way a seed exercise records its versions.
 */
export interface ArticleSeed {
  slug: string;
  /** the search the article is written for */
  query: string;
  persona: "guitarist" | "singer" | "teacher";
  written: string;
  model: string;
  /** the versions it was written to: the teaching documents' (DOC_VERSIONS) and the articles' voice (`VOICE.md`) */
  versions: { agents: number; teaching: number; voice: number };
  /** the author's own words that set what goes in, verbatim */
  notes: string[];
  /** the library blocks whose tools and wording it reuses */
  blocks: string[];
  /** calculator runs (`npm run -s theory -- …`) its facts come from */
  calculator: string[];
  /** pages read for it: the ones that rank for the search, and fact checks */
  sources: string[];
  /** anything still to check before or after it goes live */
  open: string[];
}
