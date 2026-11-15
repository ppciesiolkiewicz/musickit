# The AI autoplan at the centre

2026-11-14. Snapshot before this work: tag `v0.1-before-autoplan-rework`.

## Why

attunr has grown into a long menu: a course, ~25 theory and practice pages, a tuner, a looper, a notes creator, the AI
plan, two home pages selling different things. The product is the **AI autoplan** (`/plan`): a daily practice plan the
player's own AI writes, with the tools built into each exercise. Everything should say that. The **notes creator** is the
second tool. Everything else is **other teaching resources**: useful, reachable, but not what we sell.

The app is for the student. A teacher gets exactly the same app as a student (they practise too, and they see what their
students see). No teacher-only screens.

## Goals

1. Both home pages lead with the autoplan. Notes second. The rest as one short "Other teaching resources" part.
2. Everything except the marketing pages needs a login.
3. A logged-in person lands on their plan.
4. The app's nav is three items: **Plan · Notes · Practice**, plus the account corner.
5. **Practice** is one page of tiles (Windows Phone / Metro style) reaching every tool, drill, course and theory page.
6. Every role gets every feature.

## Non-goals

- No data migration. Plans, progress and notes stay in localStorage as now. No server storage. Nothing copied anywhere.
- No redirects for removed pages; dead links are fine.
- No live tiles (no tuner pitch or plan day inside a tile).
- No change to how the plan works inside `/plan` (flow, week view, prompt).
- `/kickstarter`, `/landing-1`, `/intro`: left as they are, just not linked from the new home pages.

## Anti-goals

- A home page that still reads like a tools catalogue, or puts the autoplan below the fold.
- Locking a person out of everything on a machine where accounts are off (local dev, previews without a database).
- A teacher seeing a different app from a student.

## Decided

### Who sees what

**Public** (no login):

- `/` (music schools) and `/players` (players): the two marketing pages
- `/faq`
- `/demo` and `/demo/*`: the hand-tuned example plans; the home pages link to them as "see an example plan"
- `/login`, `/login/*`, `/account/setup`
- `/kickstarter`, `/landing-1`, `/intro` (untouched)
- `/api/*`, Next internals, static files, icons and OG images, `robots.txt`, `sitemap.xml`

**Everything else needs a login**: `/plan`, notes (`/teachers/studio?notes=1`, `/note/*`), `/practice`, every
`/theory/*`, `/course/*`, `/tuner`, `/looper`, `/cheatsheet`, `/creator`, `/teachers/*`, `/account`, `/dev/*`.
The theory and course pages lose their search traffic. That is accepted.

How:

- A `src/proxy.ts` (Next 16's renamed middleware; see `node_modules/next/dist/docs/.../proxy.md`) with a list of public
  paths. Any other page request without the `mk_session` cookie redirects to `/login?next=<path+query>`. `/login`
  already takes `next` and checks it with `safeNext`.
- The proxy only checks that the cookie is there; it does not hit the database. A stale cookie gets through, and the
  page's client check catches it: in `PageShell` (every app page uses it), once `useAccount()` has loaded with no
  account, go to `/login?next=…`.
- **Only when accounts are on** (`NEXT_PUBLIC_ACCOUNTS === "on"`). With accounts off, nothing is gated, as today.
- A logged-in person can open `/` and `/players` like anyone else (they were sent from `/` to `/plan` until 2026-11-15).
- `sitemap.ts` lists only the public marketing pages and the demos. `robots.ts` as needed.

### Roles

`FEATURES` in `src/features/account/model.ts` gives every feature to every role (student, teacher, owner). The roles stay
in the database and `can()` stays, so a split can come back later, but nothing is split now. Update the account README
and CLAUDE.md to say so.

### The app nav

`SiteNav` on app pages: wordmark (to `/plan`), then **Plan** (`/plan`), **Notes** (`/teachers/studio?notes=1`),
**Practice** (`/practice`), and the account corner (`AccountLink`) on the right. The Learn / Guitar / Singing / Tools
dropdowns (`TheoryMenu`) leave the nav. On a phone the three items still fit in one row; no hamburger.

Marketing pages show the same three items (2026-11-15), so a visitor sees what is inside; without a login each leads
to `/login?next=…`. They add **Demos**, the wordmark goes to `/`, and search and the tuner stay off. The login page names
the place the visitor was going to ("to open your AI autoplan") and shows the quick tour (`TourCard`, as on `/demo`)
beside the form. The three places are one list, `src/lib/appPlaces.ts`.

### Practice: a page of tiles

New route `/practice` (needs login). One page, Metro style:

- Flat, solid-colour tiles, square corners or nearly, no gradients, no shadows. The colour is the page's existing
  `tone` from `src/features/theory/sections.ts`. White icon in the bottom-left, the label under it, the short `desc`
  only on wide tiles.
- Mixed sizes on a dense grid: 1×1 for most, 2×1 for a few headline tools.
- Grouped under small headings, in this order: **Guitar**, **Singing**, **Play along**, **Theory**, **Learn**
  (Course, Cheatsheet). The plan and the notes creator are not tiles; they are in the nav.
- The source of truth for the tiles is `sections.ts`: add what the tile needs there (group for the tile page, `wide`)
  rather than a second list. Pages not in `sections.ts` today (`/cheatsheet`, `/theory/basics`, `/theory/circle`
  etc.) are added if they are real pages a player would open.
- Phone width: 2 or 3 tiles across, wide tiles span the row, 16px gutter.

### Home pages

Both stay, both rewritten around the same shape:

1. **Hero: the autoplan.** What it is in one line (a daily practice plan your own AI writes, with the tools in each
   exercise), a primary button (Log in → your plan) and a secondary "See an example plan" (`/demo/...`). Picture: a
   plan day (reuse what `LessonMocks` / `AiPrep` have).
2. **How it works**: three short steps (answer a few questions → your AI writes the week → practise with the tools in
   each exercise; rate it and next week builds on it).
3. **Notes**, second: the notes creator, lesson notes with playable chords, scales and positions, shared as a link.
4. **Other teaching resources**: one compact strip pointing at the course, the theory pages, and the practice tools
   (tuner, looper, metronome and drone, backing tracks), all leading into Practice after login.
5. The existing contact / founder ending.

`/` speaks to music schools (teachers give students a plan between lessons; the school's own name is a line, not a
section). `/players` speaks to players. Sections that sell anything other than plan and notes (video course, private
lessons, VIP coaching, white-labelling as its own section, the colour-system section, "coming soon") go.
`SiteFooter` drops the dead and demoted links (`/teach`, coaching links) and points at the new structure.

Copy: written by me with `marketing:draft-content` for the shape and `design:ux-copy` + `teaching-voice` ("Words about
the app") for the wording. Plain, short, no hype, no exclamation marks.

### Removed

`/teach` (page deleted, no redirect; remove links to it).

## Settled after review (my calls)

- **Shared note links** carry the note in the URL hash (`#note=…`), which never reaches the server. The proxy lets
  `/teachers/studio` through; the client guard gates it instead, and before redirecting to `/login` it stores the hash
  (localStorage, with the path and a time; dropped after an hour) and puts it back when the person lands on the same
  path with no hash after logging in. `/note/*` (no hash) is gated by the proxy like any page.
- **The schools page promises no plan hand-over.** Nothing carries a plan from teacher to student and none is built.
  `/` says: every student gets a daily plan from their own AI; teachers use the same app and send lesson notes as a link.
  The stale "A student gets plans from a teacher" comment in `FEATURES` goes.
- **One `SiteNav`, the three places on every page.** On a public path (shared list with the proxy,
  `src/lib/publicPaths.ts`) the bar adds Demos and its wordmark goes to `/`; on any other path the wordmark goes to
  `/plan` and search and the tuner join it. The account corner (Log in, or the name) is on both. Demo plans may link to
  gated tool pages; those go through login.
- **`/teachers/video/render` stays public** (the video render script opens it with no session).
- The client guard lives in the root layout (one small client component), not in `PageShell`, so pages without
  `PageShell` (course, looper, studio, cheatsheet) are covered too. It reuses the public-path list.

## Left to the builder

- Exact tile layout, which 3–5 tools are wide, the heading names' wording.
- Whether `TheoryMenu` and other now-unused nav pieces are deleted or left unused (delete if nothing uses them).
- The exact public-path list in the proxy, as long as it matches "Who sees what".
- Which existing landing components are reused for the hero picture.
- Spotlight search (`Spotlight`, in the root layout) stays as is.

## Done when

- Signed out, with accounts on: `/`, `/players`, `/faq`, `/demo/*`, `/login` open; `/plan`, `/practice`,
  `/theory/scales`, `/tuner` go to `/login?next=…` and come back after login.
- Signed in: `/` goes to `/plan`; nav shows Plan · Notes · Practice; a student account can use the plan and notes.
- `/practice` reaches every tool page; reads well at phone width.
- Feature tests, `tsc`, eslint on changed files clean; home pages, Practice and nav read on the dev server.
