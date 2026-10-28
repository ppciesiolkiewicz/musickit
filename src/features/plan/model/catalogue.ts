import { ALL_SECTIONS, sectionHref } from "@/features/course/course";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { scaleHref } from "@/features/theory/keySlug";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { THEORY_SECTIONS } from "@/features/theory/sections";

/** One attunr page the AI may send the player to. */
export interface CatalogueEntry {
  href: string;
  label: string;
  desc: string;
}

/** Every page an exercise can link to: the practice pages, the course sections and the scales. Built on first use (the course is large). */
export function catalogue(): CatalogueEntry[] {
  const pages = THEORY_SECTIONS.filter((s) => s.href !== "/theory" && s.href !== "/plan").map((s) => ({ href: s.href, label: s.label, desc: s.desc }));
  const course = ALL_SECTIONS.map(({ stage, section }) => ({ href: sectionHref(stage.slug, section.slug), label: section.title, desc: `Course ${stage.label} · ${stage.title}` }));
  const scales = [...MODE_PAGES.map((m) => ({ slug: m.slug, name: m.name })), ...PENTATONICS.map((p) => ({ slug: p.slug, name: p.name }))]
    .map((s) => ({ href: scaleHref(s.slug, DEFAULT_KEY_PC), label: s.name, desc: "Scale page (the key is in the last part of the path, e.g. /a, /f-sharp)" }));
  return [{ href: "/tuner", label: "Tuner", desc: "Tune up before practising" }, ...pages, ...course, ...scales];
}

const pathOf = (href: string) => href.split(/[?#]/)[0].replace(/\/$/, "") || "/";

/**
 * The link as an attunr path if it points at a catalogue page, otherwise undefined. A scale page in any key counts
 * (/theory/scales/dorian/e), and a query or hash on a known page is kept.
 */
export function checkLink(link: unknown, entries: CatalogueEntry[]): string | undefined {
  if (typeof link !== "string") return undefined;
  let href = link.trim();
  const abs = href.match(/^https?:\/\/[^/]*attunr\.app(\/.*)?$/i);
  if (abs) href = abs[1] ?? "/";
  if (!href.startsWith("/") || href.startsWith("//")) return undefined;
  const path = pathOf(href);
  const known = new Set(entries.map((e) => pathOf(e.href)));
  if (known.has(path)) return href;
  const scale = path.match(/^(\/theory\/scales\/[a-z0-9-]+)\/[a-z-]+$/);
  return scale && entries.some((e) => e.href.startsWith(`${scale[1]}/`)) ? href : undefined;
}
