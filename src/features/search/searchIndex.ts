import type { IconName } from "@/components/Icon";
import { ALL_SECTIONS, sectionHref } from "@/features/course/course";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { scaleHref } from "@/features/theory/keySlug";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { THEORY_SECTIONS } from "@/features/theory/sections";

/** One place the spotlight can open. `group` is the heading it shows under; `words` are extra terms it matches on. */
export interface SearchEntry {
  href: string;
  label: string;
  desc: string;
  icon: IconName;
  group: string;
  words?: string;
}

const PAGES: SearchEntry[] = [
  { href: "/", label: "Home", desc: "The attunr front page", icon: "layout-dashboard", group: "Pages" },
  { href: "/tuner", label: "Tuner", desc: "Tune your guitar", icon: "gauge", group: "Pages", words: "tune pitch" },
  ...THEORY_SECTIONS.map((s) => ({ href: s.href, label: s.label, desc: s.desc, icon: s.icon, group: "Pages" })),
  { href: "/teachers", label: "For teachers", desc: "attunr in your lessons", icon: "graduation-cap", group: "Pages", words: "teach lesson" },
  { href: "/creator", label: "Creator", desc: "Build your own exercises", icon: "pencil", group: "Pages" },
];

/** Every page, course section and scale, in that order. Built on first use: the course data is large. */
export function searchEntries(): SearchEntry[] {
  const course = ALL_SECTIONS.map(({ stage, section }) => ({
    href: sectionHref(stage.slug, section.slug),
    label: section.title,
    desc: `Course ${stage.label} · ${stage.title}`,
    icon: "book-open" as const,
    group: "Course",
  }));
  const scales = [
    ...MODE_PAGES.map((m) => ({ slug: m.slug, name: m.name, alias: undefined as string | undefined })),
    ...PENTATONICS.map((p) => ({ slug: p.slug, name: p.name, alias: p.alias })),
  ].map((s) => ({
    href: scaleHref(s.slug, DEFAULT_KEY_PC),
    label: s.name,
    desc: s.alias ? `Scale · ${s.alias}` : "Scale",
    icon: "waves" as const,
    group: "Scales",
    words: `scale mode ${s.alias ?? ""}`,
  }));
  return [...PAGES, ...course, ...scales];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * The entries matching `query`, best first: every word of the query must appear somewhere; a label that starts with the
 * query beats one with a word starting with it, which beats a match anywhere. An empty query gives the pages.
 */
export function searchFor(entries: SearchEntry[], query: string, limit = 30): SearchEntry[] {
  const q = norm(query.trim());
  if (!q) return entries.filter((e) => e.group === "Pages");
  const words = q.split(/\s+/);
  return entries
    .map((e, i) => {
      const label = norm(e.label);
      const hay = `${label} ${norm(e.desc)} ${norm(e.words ?? "")}`;
      if (!words.every((w) => hay.includes(w))) return null;
      const score = label.startsWith(q) ? 0 : label.split(/\W+/).some((w) => w.startsWith(words[0])) ? 1 : label.includes(words[0]) ? 2 : 3;
      return { e, score, i };
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, limit)
    .map((r) => r.e);
}
