import { THEORY_SECTIONS, type TheorySection } from "@/features/theory/sections";
import { isOpenCoursePath, isOpenToolPath } from "@/lib/publicPaths";

/** The path of a section's link, without its hash or query ("/theory/caged#neighbours" is /theory/caged). */
const pathOf = (href: string) => href.split(/[?#]/)[0];

/** The interactive notes are hidden from the nav for now (NOTES-HIDDEN in src/lib/appPlaces.ts), so Explore leaves them out too. */
const HIDDEN = ["/teachers/studio"];

/**
 * The pages on /explore, from `THEORY_SECTIONS`: `open` the ones a visitor may use without an account (OPEN_TOOLS and the
 * course in src/lib/publicPaths.ts), `locked` the rest, which need one. A page in both lists of sections is shown once.
 */
export function exploreTools(): { open: TheorySection[]; locked: TheorySection[] } {
  const seen = new Set<string>();
  const pages = THEORY_SECTIONS.filter((s) => !HIDDEN.includes(pathOf(s.href)) && !seen.has(s.href) && seen.add(s.href));
  const isOpen = (s: TheorySection) => isOpenToolPath(pathOf(s.href)) || isOpenCoursePath(pathOf(s.href));
  return { open: pages.filter(isOpen), locked: pages.filter((s) => !isOpen(s)) };
}
