/**
 * Review comments on the examples page: each pinned to one section of one example by its address and index, with a hash
 * of the section as it was and the example file's commit, so a later change to the section shows the comment as outdated.
 * Pure: the page keeps them in localStorage (`COMMENTS_KEY`).
 */

import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { sectionsOf } from "@/features/plan/model/tools";
import { parsePreview } from "./preview";

export const COMMENTS_KEY = "musickit.dev.comments";

export interface SectionComment {
  id: string;
  /** the example's id (its file name) */
  example: string;
  /** where the exercise sits: "ex" for an exercise example, "d2.e1" for day 3, exercise 2 of a plan */
  address: string;
  /** the section's index in the exercise's sections */
  index: number;
  /** the section's type and its text cut short, so the copied comment reads on its own */
  kind: string;
  quote: string;
  /** `sectionHash` of the section when commented */
  hash: string;
  /** the example file's last commit when commented ("uncommitted" when the file was new), and whether it had edits */
  commit: string;
  dirty?: boolean;
  text: string;
  /** ISO time */
  at: string;
}

/** A short stable hash (FNV-1a, 32 bit, hex) of any JSON value. */
export function sectionHash(section: unknown): string {
  const s = JSON.stringify(section) ?? "";
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** A section's readable text: a heading's or paragraph's text, a list's items, a tool's type, a link's href. */
export function sectionText(section: { type: string; [k: string]: unknown }): string {
  const s = section as { type: string; text?: string; items?: string[]; tool?: { type?: string }; href?: string };
  if (s.type === "list") return (s.items ?? []).join(" / ");
  if (s.type === "tool") return `tool: ${s.tool?.type ?? "?"}`;
  if (s.type === "link") return `link: ${s.href ?? ""}`;
  return s.text ?? "";
}

export const quoteOf = (text: string, max = 140) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Where a section is, for people: "section 4" or "day 3, exercise 2, section 4". */
export function placeOf(c: Pick<SectionComment, "address" | "index">): string {
  const m = /^d(\d+)\.e(\d+)$/.exec(c.address);
  return `${m ? `day ${Number(m[1]) + 1}, exercise ${Number(m[2]) + 1}, ` : ""}section ${c.index + 1}`;
}

/** How a comment stands against the section now: as commented, changed since, or the section is gone. */
export type CommentState = "current" | "changed" | "gone";
export const stateOf = (c: SectionComment, nowHash: string | undefined): CommentState => (nowHash === undefined ? "gone" : nowHash === c.hash ? "current" : "changed");

/** Stored comments, made safe: anything not shaped like a comment is dropped. */
export function readComments(raw: unknown): SectionComment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is SectionComment => {
    const x = c as SectionComment;
    return !!x && typeof x.id === "string" && typeof x.example === "string" && typeof x.address === "string" && Number.isInteger(x.index) &&
      typeof x.hash === "string" && typeof x.text === "string" && typeof x.commit === "string";
  });
}

/**
 * Every comment as one Markdown text to paste into a chat or an issue: grouped by example (with its file and the commit
 * it was read at), in section order, each with its quote and, when the section changed or went since, a note saying so.
 */
export function commentsMarkdown(comments: SectionComment[], opts: { head?: string; files?: Record<string, { path: string; commit: string; dirty?: boolean }>; hashes?: Record<string, string | undefined> }): string {
  const key = (c: SectionComment) => `${c.example}|${c.address}|${c.index}`;
  const byExample = new Map<string, SectionComment[]>();
  for (const c of comments) byExample.set(c.example, [...(byExample.get(c.example) ?? []), c]);
  const out = [`# Comments on the autoplan examples${opts.head ? ` (HEAD ${opts.head})` : ""}`];
  for (const [example, list] of byExample) {
    const f = opts.files?.[example];
    out.push("", `## ${example}${f ? ` (${f.path} @ ${f.commit}${f.dirty ? ", uncommitted edits" : ""})` : ""}`);
    for (const c of [...list].sort((a, b) => a.address.localeCompare(b.address) || a.index - b.index || a.at.localeCompare(b.at))) {
      const state = opts.hashes ? stateOf(c, opts.hashes[key(c)]) : "current";
      out.push("", `- **${placeOf(c)}** (${c.kind}, commented at ${c.commit}${c.dirty ? "+edits" : ""})`, `  > ${c.quote}`);
      if (state === "changed") out.push("  ⚠ The section has changed since this comment.");
      if (state === "gone") out.push("  ⚠ This section no longer exists.");
      out.push(...c.text.split("\n").map((l) => `  ${l}`));
    }
  }
  return out.join("\n");
}

/** The key `commentsMarkdown` looks hashes up by. */
export const hashKey = (example: string, address: string, index: number) => `${example}|${address}|${index}`;

/**
 * The hash of every section of every example as the page shows it now, keyed by `hashKey`: an exercise example's sections
 * at "ex", a plan's at "d<day>.e<exercise>". What `commentsMarkdown` and the page compare comments against.
 */
export function exampleHashes(examples: { id: string; json: string }[], entries: CatalogueEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { id, json } of examples) {
    const p = parsePreview(json, entries);
    if (!p.ok) continue;
    const put = (address: string, e: Parameters<typeof sectionsOf>[0]) => sectionsOf(e).forEach((s, i) => (out[hashKey(id, address, i)] = sectionHash(s)));
    if (p.exercise) put("ex", p.exercise);
    p.config?.days.forEach((d, di) => d.exercises.forEach((e, ei) => put(`d${di}.e${ei}`, e)));
  }
  return out;
}
