/** The public address of the site, for canonical links and the sitemap. NEXT_PUBLIC_SITE_URL overrides it (a preview deploy). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.attunr.app").replace(/\/$/, "");
