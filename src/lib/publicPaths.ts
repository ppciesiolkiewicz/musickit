/*
 * Which paths a visitor may open without logging in. One list for the proxy (src/proxy.ts), the client login guard
 * (features/account/ui/LoginGuard) and the nav (which bar a page shows). Everything else needs a login, when the site has
 * accounts at all. Design: docs/superpowers/specs/2026-11-14-autoplan-centre-design.md.
 */

/**
 * The pages a visitor reads: the two home pages, the FAQ, the terms, the privacy policy, the voice-care notes, the articles (`/learn`) and their author's page (`/about`), the demo plans, the looper's product page (`/online-looper`), the open tools' list (`/explore`), logging in (and a teacher's student's
 * claim link, `/claim`, opened before their first log-in), and pages left as they were.
 */
const MARKETING = ["/", "/schools", "/faq", "/terms", "/privacy", "/voice-care", "/learn", "/about", "/demo", "/explore", "/login", "/claim", "/kickstarter", "/landing-1", "/intro", "/reminders/off", "/online-looper"];

/**
 * The app's tools a visitor may use without logging in, so a search can land on them: the scale pages (every mode in every
 * key), the chords, CAGED, the tuner, the metronome and the looper. They show the app's bar, with Explore and a sign-up corner for a
 * visitor (`features/explore`); `/explore` lists them. The sitemap lists them too (src/app/sitemap.ts).
 */
export const OPEN_TOOLS = ["/theory/scales", "/theory/chords", "/theory/caged", "/tuner", "/theory/metronome-drone", "/looper"];

/**
 * The course (`/course`, every stage and section), open so a search can land on a section. It shows the app's bar and a
 * sign-up offer at the end (`CourseShell`); the sitemap lists its written sections (src/app/sitemap.ts).
 */
const OPEN_COURSE = ["/course"];

/**
 * The app's pages anyone may open by their link: a shared note (`/notes/shared/<id>`), and a teacher invite (`/join/<token>`),
 * which logs a visitor in on the page itself. Not marketing: they show the app's bar.
 */
const SHARED = ["/notes/shared", "/join"];

/**
 * Public but not for reading: APIs, Next's and Vercel's own paths, the folders of `public/` (the pitch model's weight files
 * have no extension), the page the video render script opens with no session, and the admin pages, the dev tools among them (no login in
 * development; in production they answer 404 to anyone but a signed-in admin, `features/devtools/server/access.ts`).
 */
const OTHER = ["/api", "/admin", "/_next", "/_vercel", "/images", "/instruments", "/intro", "/models", "/videos", "/teachers/video/render"];

/** The path itself or anything under it ("/demo" covers "/demo/guitar-beginner", not "/demox"). */
const under = (path: string, base: string) => (base === "/" ? path === "/" : path === base || path.startsWith(`${base}/`));

/** A file: an extension in the last segment, or an image route Next generates (opengraph-image, icon…). */
const isFile = (path: string) => {
  const last = path.slice(path.lastIndexOf("/") + 1);
  return /\.[a-z0-9]+$/i.test(last) || /^(opengraph-image|twitter-image|icon|apple-icon)(-\w+)?$/.test(last);
};

export const isMarketingPath = (path: string): boolean => MARKETING.some((b) => under(path, b));

/** One of the open tools, or a page under one ("/theory/scales/dorian/d"). */
export const isOpenToolPath = (path: string): boolean => OPEN_TOOLS.some((b) => under(path, b));

/** The course or a page in it: open, but not one of the tools. */
export const isOpenCoursePath = (path: string): boolean => OPEN_COURSE.some((b) => under(path, b));

export const isPublicPath = (path: string): boolean => isMarketingPath(path) || isOpenToolPath(path) || OPEN_COURSE.some((b) => under(path, b)) || SHARED.some((b) => under(path, b)) || OTHER.some((b) => under(path, b)) || isFile(path);

/** The login page, coming back to `pathAndQuery` afterwards. */
export const loginHref = (pathAndQuery: string): string => `/login?next=${encodeURIComponent(pathAndQuery)}`;
