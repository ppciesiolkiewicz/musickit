/**
 * Dev notes: one registry for every note on the app, kept by route. A note is on a text the maker clicked on any page
 * (found again by the text itself, no wiring in the components), or, through the pencils on /dev/examples, on one
 * section of one example (`section`: pinned by address, index and a hash of the section). Pure: the overlay keeps them
 * in localStorage (`COPY_NOTES_KEY`). No plan imports here: the overlay that uses it is mounted on every page.
 */

export const COPY_NOTES_KEY = "musickit.dev.copyNotes";

/** Where a note on /dev/examples sits: one section of one example, as it was when noted. */
export interface NoteSection {
  /** the example's id (its file name) */
  example: string;
  /** where the exercise sits: "ex" for an exercise example, "d2.e1" for day 3, exercise 2 of a plan */
  address: string;
  /** the section's index in the exercise's sections */
  index: number;
  /** the section's type */
  kind: string;
  /** `sectionHash` of the section when noted or last re-pinned */
  hash: string;
  /** the example file's last commit then ("uncommitted" when the file was new), and whether it had edits */
  commit: string;
  dirty?: boolean;
}

export interface CopyNote {
  id: string;
  /** the page's path when noted */
  route: string;
  /** the clicked element's text (or the section's), cut short */
  text: string;
  /** a short hint to find it again: tag, aria-label or classes; for a section, the example and its place */
  where: string;
  note: string;
  /** ISO time */
  at: string;
  /** the checkout's HEAD (short) when noted or last re-pinned; absent when git wasn't there */
  head?: string;
  section?: NoteSection;
}

const isSection = (s: unknown): s is NoteSection => {
  const x = s as NoteSection;
  return !!x && typeof x === "object" && typeof x.example === "string" && typeof x.address === "string" && Number.isInteger(x.index) && typeof x.hash === "string" && typeof x.commit === "string";
};

export function readCopyNotes(raw: unknown): CopyNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is CopyNote =>
      !!n && typeof n === "object" && ["id", "route", "text", "where", "note", "at"].every((k) => typeof (n as Record<string, unknown>)[k] === "string") &&
      ((n as CopyNote).section === undefined || isSection((n as CopyNote).section)),
  );
}

/** The text of an element as people read it: whitespace squeezed, cut short. */
export function squeeze(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** A link to a note where it is: its page, which scrolls to it and marks it (`noteIdOf`). */
export const noteHref = (n: Pick<CopyNote, "id" | "route">, route = n.route) => `${route}#note-${n.id}`;

/** The note a location hash links to (`#note-<id>`), if any. */
export const noteIdOf = (hash: string): string | null => /^#note-(.+)$/.exec(hash)?.[1] ?? null;

/** The key a section's hash is looked up by. */
export const hashKey = (example: string, address: string, index: number) => `${example}|${address}|${index}`;

/** Where a section is, for people: "section 4" or "day 3, exercise 2, section 4". */
export function placeOf(s: Pick<NoteSection, "address" | "index">): string {
  const m = /^d(\d+)\.e(\d+)$/.exec(s.address);
  return `${m ? `day ${Number(m[1]) + 1}, exercise ${Number(m[2]) + 1}, ` : ""}section ${s.index + 1}`;
}

/** How a section note stands against the section now: as noted, changed since, or the section is gone. */
export type CommentState = "current" | "changed" | "gone";
export const stateOf = (s: Pick<NoteSection, "hash">, nowHash: string | undefined): CommentState => (nowHash === undefined ? "gone" : nowHash === s.hash ? "current" : "changed");

/** The notes (of one page, or of all when `route` is left out) pinned to `head`: they still hold at that commit. */
export const repinCopyNotes = (notes: CopyNote[], head: string, route?: string): CopyNote[] =>
  notes.map((n) => (route === undefined || n.route === route ? { ...n, head } : n));

/** The notes without those of one page (or without any when `route` is left out). */
export const clearCopyNotes = (notes: CopyNote[], route?: string): CopyNote[] => (route === undefined ? [] : notes.filter((n) => n.route !== route));

/** How many section notes no longer match their section, given every section's hash now. */
export const outdatedCount = (notes: CopyNote[], hashes: Record<string, string>): number =>
  notes.filter((n) => n.section && stateOf(n.section, hashes[hashKey(n.section.example, n.section.address, n.section.index)]) !== "current").length;

export interface MarkdownOpts {
  /** the checkout's HEAD: a note pinned to another one says so */
  head?: string;
  /** the example files, to name a section note's file */
  files?: Record<string, { path: string }>;
  /** every section's hash now (by `hashKey`), to flag section notes whose section changed or went */
  hashes?: Record<string, string | undefined>;
}

/**
 * Notes as Markdown, by page: the wording quoted, then the note; with the HEAD each was pinned to when it differs from
 * `head`. Section notes come in section order, named by example (and file) and place, with a warning when outdated.
 */
export function copyNotesMarkdown(notes: CopyNote[], opts: MarkdownOpts = {}): string {
  const byRoute = new Map<string, CopyNote[]>();
  for (const n of notes) byRoute.set(n.route, [...(byRoute.get(n.route) ?? []), n]);
  const order = (a: CopyNote, b: CopyNote) =>
    !a.section || !b.section ? Number(!!a.section) - Number(!!b.section) :
      a.section.example.localeCompare(b.section.example) || a.section.address.localeCompare(b.section.address) || a.section.index - b.section.index || a.at.localeCompare(b.at);
  const line = (n: CopyNote) => {
    const at = n.head && opts.head && n.head !== opts.head ? `, at ${n.head}` : "";
    const s = n.section;
    if (!s) return `- "${n.text}" (${n.where}${at})\n  → ${n.note.replace(/\n/g, "\n    ")}`;
    const file = opts.files?.[s.example]?.path;
    const state = opts.hashes ? stateOf(s, opts.hashes[hashKey(s.example, s.address, s.index)]) : "current";
    const warn = state === "changed" ? "\n  ⚠ The section has changed since this note." : state === "gone" ? "\n  ⚠ This section no longer exists." : "";
    return `- "${n.text}" (${s.example}${file ? ` ${file}` : ""}, ${placeOf(s)}, ${s.kind}${at})${warn}\n  → ${n.note.replace(/\n/g, "\n    ")}`;
  };
  return [...byRoute].map(([route, list]) => `## ${route}\n\n${[...list].sort(order).map(line).join("\n")}`).join("\n\n");
}

/** Where /dev/examples kept its section comments before they joined these notes; moved over once (`notesOfOldComments`). */
export const OLD_COMMENTS_KEY = "musickit.dev.comments";

/** The old store's comments as notes on /dev/examples; anything not shaped like a comment is dropped. */
export function notesOfOldComments(raw: unknown): CopyNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    const x = c as Record<string, unknown>;
    if (!x || typeof x.id !== "string" || typeof x.text !== "string" || !isSection(x)) return [];
    const s = x as unknown as NoteSection;
    return [{
      id: x.id, route: "/dev/examples", text: typeof x.quote === "string" ? x.quote : "", where: `${s.example} · ${placeOf(s)}`, note: x.text,
      at: typeof x.at === "string" ? x.at : new Date(0).toISOString(),
      section: { example: s.example, address: s.address, index: s.index, kind: typeof s.kind === "string" ? s.kind : "?", hash: s.hash, commit: s.commit, ...(s.dirty ? { dirty: true } : {}) },
    }];
  });
}
