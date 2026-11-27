import type { MetadataRoute } from "next";
import { ARTICLES } from "@/features/articles";
import { SITE_URL } from "@/lib/site";
import { OPEN_TOOLS } from "@/lib/publicPaths";
import { MODE_PAGES } from "@/features/theory/scales";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { scaleHref } from "@/features/theory/keySlug";

/**
 * The day each page's words last changed, YYYY-MM-DD. Change it in the same commit as a real change to what the page says,
 * and not for anything else: a date that moves on every build tells search engines nothing, and they learn to ignore it.
 * An article's date is its own `updated`; /learn's is the newest of them.
 */
const CHANGED = {
  "/": "2026-11-26",
  "/schools": "2026-11-25",
  "/faq": "2026-11-26",
  "/terms": "2026-11-26",
  "/privacy": "2026-11-26",
  "/voice-care": "2026-11-26",
  "/about": "2026-11-26",
  "/explore": "2026-11-27",
  "/theory/scales": "2026-11-27",
  "/theory/chords": "2026-11-27",
  "/theory/caged": "2026-11-27",
  "/tuner": "2026-11-27",
  "/theory/metronome-drone": "2026-11-27",
  /** every mode and pentatonic in every key, /theory/scales/<slug>/<key>: one date for them all, since they are drawn by the same code */
  scale: "2026-11-27",
} as const;

/** An open tool's date: its own in CHANGED, or /explore's for a tool added to OPEN_TOOLS without one. */
const toolDay = (t: string) => (CHANGED as Record<string, string>)[t] ?? CHANGED["/explore"];

const day = (d: string) => new Date(`${d}T00:00:00Z`);

/** The pages a visitor can open without logging in: the site's pages, the articles, the open tools and every scale page. The rest of the app needs a login, so it isn't listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const learn = ARTICLES.map((a) => a.updated).sort().at(-1) ?? CHANGED["/"];
  return [
    { url: `${SITE_URL}/`, lastModified: day(CHANGED["/"]), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/schools`, lastModified: day(CHANGED["/schools"]), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified: day(CHANGED["/faq"]), changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: day(CHANGED["/terms"]), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: day(CHANGED["/privacy"]), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/voice-care`, lastModified: day(CHANGED["/voice-care"]), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/learn`, lastModified: day(learn), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: day(CHANGED["/about"]), changeFrequency: "yearly", priority: 0.4 },
    ...ARTICLES.map((a) => ({ url: `${SITE_URL}/learn/${a.slug}`, lastModified: day(a.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/explore`, lastModified: day(CHANGED["/explore"]), changeFrequency: "monthly", priority: 0.7 },
    ...OPEN_TOOLS.map((t) => ({ url: `${SITE_URL}${t}`, lastModified: day(toolDay(t)), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...[...MODE_PAGES, ...PENTATONICS].flatMap((m) =>
      Array.from({ length: 12 }, (_, pc) => ({ url: `${SITE_URL}${scaleHref(m.slug, pc)}`, lastModified: day(CHANGED.scale), changeFrequency: "yearly" as const, priority: 0.6 })),
    ),
  ];
}
