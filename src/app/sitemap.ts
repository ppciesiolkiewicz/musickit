import type { MetadataRoute } from "next";
import { ARTICLES } from "@/features/articles";
import { SITE_URL } from "@/lib/site";

/** The pages a visitor can read without logging in. The app (plan, notes, practice, the theory pages) needs a login, so it isn't listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/schools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/voice-care`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...ARTICLES.map((a) => ({ url: `${SITE_URL}/learn/${a.slug}`, lastModified: new Date(`${a.updated}T00:00:00Z`), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
