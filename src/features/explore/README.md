# Explore

What a visitor who isn't signed in may use, and the offer to make an account. The tools here are open so a search can land on them (each is in the sitemap, `src/app/sitemap.ts`); everything else in the app still needs a login.

- Which tools are open is one list, `OPEN_TOOLS` in `src/lib/publicPaths.ts` (the scale pages with every mode in every key, chords, CAGED, the tuner, the metronome and drone). The proxy, the login guard, the sitemap and `/explore` all read it. Opening another tool is one line there, plus its date in the sitemap's `CHANGED`.
- `VisitorSignUp.tsx`: `useVisitor()` (signed out on a site with accounts; false until the session read is done, so a signed-in player never sees the offer flash), `SignUpCorner` (one line and Create account, for `PageShell`'s `action`), `SignUpEnd` (the larger section for `PageShell`'s `end`: what an account gives, a few locked tools by name, Create account; `tools={false}` leaves the tool names out) and `VisitorOnly` (the nav's Explore link). Create account goes to `/login`, coming back to the same page.
- `tools.ts`: `exploreTools()`, the pages of `THEORY_SECTIONS` split into `open` and `locked` for `/explore` (`src/app/explore/page.tsx`), which draws them with the Practice page's `PracticeTile`.
- Each open tool's page passes `action={<SignUpCorner />}` and `end={<SignUpEnd />}` to `PageShell` itself. A tool added to `OPEN_TOOLS` needs both.
- The offer's line, "More practice tools and daily practice plan", is the user's own wording (2026-11-27).
