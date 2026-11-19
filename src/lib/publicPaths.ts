/*
 * Which paths a visitor may open without logging in. One list for the proxy (src/proxy.ts), the client login guard
 * (features/account/ui/LoginGuard) and the nav (which bar a page shows). Everything else needs a login, when the site has
 * accounts at all. Design: docs/superpowers/specs/2026-11-14-autoplan-centre-design.md.
 */

/**
 * The pages a visitor reads: the two home pages, the FAQ, the terms, the demo plans, logging in (and a teacher's student's
 * claim link, `/claim`, opened before their first log-in), and pages left as they were.
 */
const MARKETING = ["/", "/players", "/faq", "/terms", "/demo", "/login", "/claim", "/kickstarter", "/landing-1", "/intro"];

/** The app's pages anyone may open by their link: a shared note (`/notes/shared/<id>`). Not marketing: they show the app's bar. */
const SHARED = ["/notes/shared"];

/**
 * Public but not for reading: APIs, Next's and Vercel's own paths, the folders of `public/` (the pitch model's weight files
 * have no extension), the page the video render script opens with no session, and the dev tools and admin pages (no login in
 * development; in production they answer 404 to anyone but a signed-in admin, `features/devtools/server/access.ts`).
 */
const OTHER = ["/api", "/dev", "/admin", "/_next", "/_vercel", "/images", "/instruments", "/intro", "/models", "/videos", "/teachers/video/render"];

/** The path itself or anything under it ("/demo" covers "/demo/guitar-beginner", not "/demox"). */
const under = (path: string, base: string) => (base === "/" ? path === "/" : path === base || path.startsWith(`${base}/`));

/** A file: an extension in the last segment, or an image route Next generates (opengraph-image, icon…). */
const isFile = (path: string) => {
  const last = path.slice(path.lastIndexOf("/") + 1);
  return /\.[a-z0-9]+$/i.test(last) || /^(opengraph-image|twitter-image|icon|apple-icon)(-\w+)?$/.test(last);
};

export const isMarketingPath = (path: string): boolean => MARKETING.some((b) => under(path, b));

export const isPublicPath = (path: string): boolean => isMarketingPath(path) || SHARED.some((b) => under(path, b)) || OTHER.some((b) => under(path, b)) || isFile(path);

/** The login page, coming back to `pathAndQuery` afterwards. */
export const loginHref = (pathAndQuery: string): string => `/login?next=${encodeURIComponent(pathAndQuery)}`;
