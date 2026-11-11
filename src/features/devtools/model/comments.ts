/**
 * Notes on the examples page's sections: each pinned to one section of one example by its address and index, with a
 * hash of the section as it was and the example file's commit, so a later change to the section shows the note as
 * outdated. They live with every other dev note (`copyNotes.ts`, `section`); this file has what needs the plan model.
 */

import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { cellsOf, type PlainCell as Section } from "@/features/plan/model/tools";
import { parsePreview } from "./preview";
import { hashKey, type CopyNote, type NoteSection } from "./copyNotes";

export { hashKey };

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

/**
 * Every section of every example as the page shows it now, keyed by `hashKey`: an exercise example's sections at "ex",
 * a plan's at "d<day>.e<exercise>". What the section notes are checked against and re-pinned to.
 */
export function exampleSections(examples: { id: string; json: string }[], entries: CatalogueEntry[]): Record<string, Section> {
  const out: Record<string, Section> = {};
  for (const { id, json } of examples) {
    const p = parsePreview(json, entries);
    if (!p.ok) continue;
    const put = (address: string, e: { cells: Parameters<typeof cellsOf>[0] }) => cellsOf(e.cells).forEach((s, i) => (out[hashKey(id, address, i)] = s));
    if (p.exercise) put("ex", p.exercise);
    p.config?.days.forEach((d, di) => d.exercises.forEach((e, ei) => put(`d${di}.e${ei}`, e)));
  }
  return out;
}

/** The hash of each of `exampleSections`: what `copyNotesMarkdown` and `stateOf` compare section notes against. */
export function exampleHashes(examples: { id: string; json: string }[], entries: CatalogueEntry[]): Record<string, string> {
  return hashesOf(exampleSections(examples, entries));
}

export const hashesOf = (sections: Record<string, Section>): Record<string, string> =>
  Object.fromEntries(Object.entries(sections).map(([k, s]) => [k, sectionHash(s)]));

/**
 * Every section note pinned again to its section as it is now and to its example file's current commit, as *keep* does
 * for one: none reads as changed after. A note whose section is gone, and any other note, stays as it was.
 */
export function repinSectionNotes(notes: CopyNote[], sections: Record<string, Section>, files: Record<string, { commit: string; dirty?: boolean }> = {}): CopyNote[] {
  return notes.map((n) => {
    const s = n.section && sections[hashKey(n.section.example, n.section.address, n.section.index)];
    return s && n.section ? { ...n, text: quoteOf(sectionText(s)), section: pinSection(n.section, s, files[n.section.example]) } : n;
  });
}

/** A section note's anchor pinned to the section `s` as it is now and to its file's commit (kept when unknown). */
export function pinSection(at: NoteSection, s: Section, file?: { commit: string; dirty?: boolean }): NoteSection {
  const rest: NoteSection = { ...at };
  delete rest.dirty;
  return { ...rest, kind: s.type, hash: sectionHash(s), commit: file?.commit ?? at.commit, ...((file ? file.dirty : at.dirty) ? { dirty: true } : {}) };
}
