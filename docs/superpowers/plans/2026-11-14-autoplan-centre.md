# The AI autoplan at the centre: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the AI autoplan at the centre: login wall on the app, Plan · Notes · Practice nav, a Metro tile Practice page, every role gets everything, both home pages rewritten around the autoplan.

**Architecture:** One shared public-path list (`src/lib/publicPaths.ts`) drives a Next 16 `src/proxy.ts` (cookie-presence gate, `/` → `/plan` when signed in), a client `LoginGuard` in the root layout (stale cookies, URL-hash notes), and `SiteNav`'s choice of bar. Practice tiles read `src/features/theory/sections.ts`.

**Tech Stack:** Next 16.4 (App Router, `proxy.ts`), React, Tailwind, node:test via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-autoplan-centre-design.md`

## Global Constraints

- Gate only when `process.env.NEXT_PUBLIC_ACCOUNTS === "on"`; off means nothing is gated.
- Session cookie `mk_session` (server, HttpOnly); hint cookie `mk_in` (script-readable). Proxy checks presence of `mk_session` only.
- Login redirect is `/login?next=<encoded path+query>`; `/login` checks `next` with `safeNext` (max length under 600).
- No data migration; storage stays localStorage.
- No redirects for removed pages (`/teach`).
- Every word on screen written with `design:ux-copy` + `teaching-voice` "Words about the app" (marketing shape from `marketing:draft-content`): plain, short, no hype, no exclamation marks.
- Work on main; commit with a temp `GIT_INDEX_FILE` (memory: shared index).

## Review Focus

1. Requests for static files, `/_next/*`, `/api/*`, icons, OG images: must never redirect (pinned in Task 1 tests).
2. `/` signed in → `/plan`, but `/?…` from the login confirm flow must not loop (proxy only redirects `/` when the cookie is there; `/login` is public).
3. A shared note opened signed out keeps its `#note=` after login (Task 3 stash/restore tests).
4. Stale `mk_session` cookie: page renders, guard sees no account, sends to login without a loop on `/login` (guard skips public paths).
5. Phone width: Practice tiles and the app nav fit in 375px with no horizontal scroll (checked in the browser, Task 8).

---

### Task 1: Public path list

**Files:** Create `src/lib/publicPaths.ts`, `src/lib/publicPaths.test.ts`; add the test glob to `package.json` `test`.

**Produces:** `isPublicPath(pathname: string): boolean`; `isMarketingPath(pathname: string): boolean` (`/`, `/players`, `/faq`, `/demo*`, `/login*`, `/account/setup`, `/kickstarter`, `/landing-1`, `/intro`); `loginHref(pathAndQuery: string): string`.

- [ ] Test: public: `/`, `/players`, `/faq`, `/demo`, `/demo/guitar-beginner`, `/login`, `/login/confirm`, `/account/setup`, `/kickstarter`, `/landing-1`, `/intro`, `/teachers/video/render`, `/api/auth/session`, `/_next/static/x.js`, `/favicon.ico`, `/icon.png`, `/logo.png`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml`, `/instruments/piano/a.mp3`, any path with a file extension. Gated: `/plan`, `/practice`, `/theory/scales`, `/tuner`, `/looper`, `/course/1`, `/note/x`, `/account`, `/teachers/studio`, `/players-x`, `/demox`. `loginHref("/plan?day=2")` = `/login?next=%2Fplan%3Fday%3D2`.
- [ ] Implement; run `npx tsx --test src/lib/publicPaths.test.ts`; commit.

### Task 2: Proxy

**Files:** Create `src/proxy.ts`. **Consumes:** Task 1.

- [ ] `export function proxy(req: NextRequest)`: accounts off → `NextResponse.next()`. Cookie `mk_session` present and pathname `/` → redirect `/plan`. Not public and no cookie → redirect `loginHref(pathname + search)`. Studio exception: `/teachers/studio` passes through (client guard gates it, keeps the hash). `config.matcher` excludes `_next/static`, `_next/image`, `api`.
- [ ] Verify on dev server with curl: `/plan` → 307 to `/login?next=%2Fplan`; `/faq` 200; with `-b mk_session=x`, `/` → 307 `/plan`. Commit.

### Task 3: Client login guard

**Files:** Create `src/features/account/loginGuard.ts` (pure), `loginGuard.test.ts`, `ui/LoginGuard.tsx`; mount in `src/app/layout.tsx`.

**Produces:** `stashHash(store: Storage, path: string, hash: string, now: number): void`; `takeHash(store: Storage, path: string, now: number): string | null` (key `musickit.loginHash`, 1 hour life, removed once taken or expired, only for the same path).

- [ ] Tests: stash then take on same path returns hash and clears; other path → null and keeps it; after 61 min → null and cleared; empty hash not stored.
- [ ] `LoginGuard` (client): accounts off or public path → nothing. Once `useAccount()` is loaded with no account → stash `location.hash` and `location.replace(loginHref(path+search))`. Signed in and no hash → `takeHash`, if any `location.replace(path+search+hash)` (a reload, so the notes app reads its hash on load).
- [ ] Run tests, commit.

### Task 4: Every role gets everything

**Files:** `src/features/account/model.ts`, `model.test.ts`, `README.md`, `CLAUDE.md`.

- [ ] Test change: replace "notes creator and AI plans are for teachers and owners" with "every role can use every feature".
- [ ] `FEATURES` both `["student", "teacher", "owner"]`; drop the "A student gets plans from a teacher" comment. Docs say nothing is split by role now. Run account tests, commit.

### Task 5: Nav

**Files:** `src/components/SiteNav.tsx`. **Consumes:** `isMarketingPath`.

- [ ] Public bar when `isMarketingPath(active)`: wordmark → `/`; "For players" (on `/`) or "For music schools" (elsewhere); Demos pill; spacer; ThemeSwitcher; AccountLink.
- [ ] App bar otherwise: wordmark → `/plan`; NavLinks **Plan** `/plan`, **Notes** `/teachers/studio?notes=1` (active on `/teachers/studio`, `/note`), **Practice** `/practice` (active on `/practice`, `/theory`, `/course`, `/tuner`, `/looper`, `/cheatsheet`); spacer; Spotlight, Tuner, Theme, devices, AccountLink. TheoryMenu leaves the nav (delete the file if nothing else imports it).
- [ ] tsc; commit.

### Task 6: Practice tiles

**Files:** Create `src/app/practice/page.tsx`, `src/features/practice/PracticeTiles.tsx` (+ README); modify `src/features/theory/sections.ts`.

- [ ] `sections.ts`: add `wide?: boolean` on a few headline tools (Tuner, Looper, Chords, Scales, Course). Add `/cheatsheet` (learn) if missing. Export `TILE_GROUPS: { label: string; hrefs filter }` order Guitar, Singing, Play along, Theory, Learn; plan and notes creator excluded.
- [ ] `PracticeTiles`: grid `grid-cols-2 sm:grid-cols-4 lg:grid-cols-6`, `grid-flow-dense`, square aspect, wide = `col-span-2 aspect-[2/1]`; flat solid tone background (`bg-<tone>-600`), white icon bottom-left, label; `desc` only on wide. Group headings small uppercase.
- [ ] Page in `PageShell` `active="/practice"`, title "Practice". tsc; commit.

### Task 7: Home pages, footer, sitemap, /teach

**Files:** `src/components/landing/home/SchoolsHome.tsx`, `CoachingHome.tsx`, `src/components/landing/SiteFooter.tsx`, `src/app/sitemap.ts`, delete `src/app/teach/`, `src/app/page.tsx` + `players/page.tsx` metadata.

- [ ] Load `marketing:draft-content`, `design:ux-copy`, `teaching-voice`. Both pages: Hero (autoplan, primary Log in / "Open my plan" → `/plan`, secondary "See an example plan" → `/demo`, `PlanDayCard` picture) → How it works (3 steps) → Notes (`LessonNoteMock`) → Other teaching resources (one strip: course, theory pages, tuner, looper, metronome & drone, backing tracks; leads to `/practice`) → founder/contact ending. Remove course bundles, lessons/VIP, colour system, coming soon, white-label section (one line on `/` instead), SectionNav entries to match.
- [ ] Footer: drop `/teach`, coaching links; columns point at Plan, Notes, Practice, Demos, FAQ.
- [ ] Sitemap: `/`, `/players`, `/faq`, `/demo` and each demo slug.
- [ ] tsc, eslint; commit.

### Task 8: Verify

- [ ] `npm test` (touched features), `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, eslint on changed files.
- [ ] Dev server: signed-out `/`, `/players`, `/practice` → login; signed-in views of `/plan`, `/practice` at desktop and 375px; screenshots read.
- [ ] Update READMEs (account, plan mention of roles; new practice README), commit.
