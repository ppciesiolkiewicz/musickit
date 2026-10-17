import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { THEORY_SECTIONS } from "@/features/theory/sections";
import { MODE_PAGES } from "@/features/theory/scales";
import { scaleHref } from "@/features/theory/keySlug";

/** Every page worth finding by search, including each mode in each of the 12 keys. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = new Set(["/", "/tuner", "/looper", "/cheatsheet", "/theory/scales", ...THEORY_SECTIONS.map((s) => s.href)]);
  const pages = [...paths].map((p) => ({ url: SITE_URL + p, changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.8 }));
  const modes = MODE_PAGES.flatMap((m) =>
    Array.from({ length: 12 }, (_, pc) => ({ url: SITE_URL + scaleHref(m.slug, pc), changeFrequency: "monthly" as const, priority: 0.6 })),
  );
  return [...pages, ...modes];
}
