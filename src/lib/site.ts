/** The public address of the site, for canonical links and the sitemap. Set NEXT_PUBLIC_SITE_URL when it moves to its own domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://musickit-topaz.vercel.app").replace(/\/$/, "");
