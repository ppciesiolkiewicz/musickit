import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { THEORY_SECTIONS } from "@/features/theory/sections";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { scaleHref } from "@/features/theory/keySlug";
import { ALL_SECTIONS, sectionHref } from "@/features/course/course";

/** Every page worth finding by search, including each mode and pentatonic in each of the 12 keys. */
export default function sitemap(): MetadataRoute.Sitemap {
  const cleanSectionHrefs = THEORY_SECTIONS.map((s) =>
    s.href.replace(/#.*$/, "").replace(/\?.*$/, "")
  );

  const keyHubs = new Set([
    "/players",
    "/course",
    "/tuner",
    "/looper",
    "/plan",
    "/faq",
    "/intro",
    "/theory/scales",
    "/teachers",
    "/teach",
  ]);

  const paths = new Set([
    "/",
    ...keyHubs,
    "/teachers/studio",
    "/kickstarter",
    ...cleanSectionHrefs,
    ...ALL_SECTIONS.map((r) => sectionHref(r.stage.slug, r.section.slug)),
  ]);

  const now = new Date();

  const pages = [...paths].map((p) => ({
    url: SITE_URL + p,
    lastModified: now,
    changeFrequency: p === "/" || keyHubs.has(p) ? ("weekly" as const) : ("monthly" as const),
    priority: p === "/" ? 1.0 : keyHubs.has(p) ? 0.9 : 0.8,
  }));

  const modes = [...MODE_PAGES, ...PENTATONICS].flatMap((m) =>
    Array.from({ length: 12 }, (_, pc) => ({
      url: SITE_URL + scaleHref(m.slug, pc),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...pages, ...modes];
}
