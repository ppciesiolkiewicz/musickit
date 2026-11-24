import type { NextConfig } from "next";

/** Pages that moved under /theory; old links keep working. */
const THEORY_SECTIONS = ["chords", "triads", "scales", "caged", "arpeggios", "improv"];

/**
 * The instrument samples and the pitch model are preloaded on every page (src/features/sound/engine/preload.ts), so a returning
 * visitor should not fetch them again. Their names are not hashed: a week, then revalidated in the background.
 */
const SOUND_CACHE = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];

const nextConfig: NextConfig = {
  // The e2e test server (playwright.config.ts) builds into its own folder: Next allows one dev server per build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Next's upgrade reminder stops `next dev` on start; that would fail every e2e run, so the test server turns it off.
  ...(process.env.E2E === "1" ? { experimental: { agentUpgrade: false } } : {}),
  // The dev indicator's default corner, bottom left, is where the chat bubble sits.
  devIndicators: { position: "top-left" },
  // Accounts need the database. The pages' own code can't read DATABASE_URL, so it gets this instead (see accountsOpen()).
  env: { NEXT_PUBLIC_ACCOUNTS: process.env.DATABASE_URL?.trim() ? "on" : "off" },
  async headers() {
    return [
      { source: "/instruments/:path*", headers: SOUND_CACHE },
      { source: "/models/:path*", headers: SOUND_CACHE },
    ];
  },
  async redirects() {
    return [
      ...THEORY_SECTIONS.flatMap((s) => [
        { source: `/${s}`, destination: `/theory/${s}`, permanent: true },
        { source: `/${s}/:path*`, destination: `/theory/${s}/:path*`, permanent: true },
      ]),
      // the drone page became the metronome & drone page
      { source: "/theory/drone", destination: "/theory/metronome-drone", permanent: true },
      // the four-stage outline was folded into the course
      { source: "/theory/stage/:n", destination: "/course", permanent: true },
      // there is no separate register form: /login is the one way in, and it makes the account for a new email
      { source: "/register", destination: "/login", permanent: false },
      { source: "/register/teacher", destination: "/login", permanent: false },
      { source: "/register/finish", destination: "/login", permanent: false },
      // the old "Start here" hub was folded into the course
      { source: "/theory", destination: "/course", permanent: true },
    ];
  },
};

export default nextConfig;
