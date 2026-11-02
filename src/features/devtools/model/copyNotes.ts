/**
 * Notes on the app's wording: one per text the maker clicked on any page, kept by route and the text itself (no wiring
 * in the components). Pure: the overlay keeps them in localStorage (`COPY_NOTES_KEY`).
 */

export const COPY_NOTES_KEY = "musickit.dev.copyNotes";

export interface CopyNote {
  id: string;
  /** the page's path when noted */
  route: string;
  /** the clicked element's text, cut short */
  text: string;
  /** a short hint to find it again: tag, aria-label or classes */
  where: string;
  note: string;
  /** ISO time */
  at: string;
}

export function readCopyNotes(raw: unknown): CopyNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is CopyNote => !!n && typeof n === "object" && ["id", "route", "text", "where", "note", "at"].every((k) => typeof (n as Record<string, unknown>)[k] === "string"),
  );
}

/** The text of an element as people read it: whitespace squeezed, cut short. */
export function squeeze(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** All notes as Markdown, by page: the wording quoted, then the note. */
export function copyNotesMarkdown(notes: CopyNote[]): string {
  const byRoute = new Map<string, CopyNote[]>();
  for (const n of notes) byRoute.set(n.route, [...(byRoute.get(n.route) ?? []), n]);
  return [...byRoute]
    .map(([route, list]) => `## ${route}\n\n${list.map((n) => `- "${n.text}" (${n.where})\n  → ${n.note.replace(/\n/g, "\n    ")}`).join("\n")}`)
    .join("\n\n");
}
