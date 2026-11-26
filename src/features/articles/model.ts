/** The version of `VOICE.md`, the articles' voice; a seed file records the one it was written to. */
export const ARTICLE_VOICE_VERSION = 3;

/**
 * One block of a public article. Text takes two inline marks: `**bold**` and `[label](href)` links. A `care` block is the
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
  /** something to sing on the page: a heading, its lines (one paragraph each) and the tool, written as a seed exercise writes it (`parseTool` reads it) */
  | { type: "exercise"; title: string; lines: string[]; tool: Record<string, unknown>; after?: string[] };

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
