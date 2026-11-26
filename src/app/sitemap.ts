import type { MetadataRoute } from "next";
import { ARTICLES } from "@/features/articles";
import { SITE_URL } from "@/lib/site";

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
} as const;

const day = (d: string) => new Date(`${d}T00:00:00Z`);

/** The pages a visitor can read without logging in. The app (plan, notes, practice, the theory pages) needs a login, so it isn't listed. */
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
    ...ARTICLES.map((a) => ({ url: `${SITE_URL}/learn/${a.slug}`, lastModified: day(a.updated), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
