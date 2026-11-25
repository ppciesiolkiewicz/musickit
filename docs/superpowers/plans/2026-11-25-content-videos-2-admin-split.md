# ContentVideos2: the /admin split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` becomes a hub over `/admin/admin` (today's admin pages, for `admin`) and `/admin/content` (the
Content group of /dev minus the Sampler, for `content`); the library always lists everything with Seed / Database only /
Off tags; pages that need this machine's disk or git say so in production; the six deferred ContentVideos1 fixes land.

**Architecture:** Only the *page files* move. The code stays in `src/features/devtools` (library, path, stories, riff,
copy notes) and `src/features/admin`; `src/app/admin/content/*` imports devtools the way `src/app/dev/*` does today.
The gates in `devtools/server/access.ts` learn "any of these permissions", so the `/api/dev/*` routes the content pages
call open to `dev` or `content`. Old URLs redirect from one move list in `next.config.ts`; copy notes saved under an
old path are read under the new one.

**Tech Stack:** Next.js 16.4 (read `node_modules/next/dist/docs/01-app` on layouts, `redirect`, and
`next.config` `redirects` before touching routes), React, Tailwind, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-25-content-videos-design.md`, §2 (Pages) and the library tags in §5. Task line:
`tasks.txt` "ContentVideos2". Riff editing in the app (§5a) is **not** in this plan: it is build step 2b,
ContentVideos11, after this one. Here the Riff maker follows the §2 row's "until §5a lands": Save to block writes the
seed file, works in development only and says so elsewhere (Task 5). Previous step's plan: `docs/superpowers/plans/2026-11-25-content-videos-1-permissions.md`.

## Global Constraints

- Permissions are `dev`, `content`, `admin`; none implies another. `content` opens `/admin/content/*` and the API
  routes those pages call; `admin` opens `/admin/admin/*` and `/api/admin/*`; `dev` opens `/dev` and `/api/dev/*`.
- In development every gate stays open with no login, as today (`/admin` and `/dev` stay public paths).
- `/admin` (the hub) opens to anyone with `content` or `admin`; everyone else gets a 404, as the other gates do.
- Moved: `/admin/{messages,users,invites}` → `/admin/admin/{…}`; `/dev/{library,path,stories,onboarding,riff,studio,notes,block}`
  → `/admin/content/{…}`. `/dev/block` moves too **(call)**: Library and Learning path open it. `/dev/sampler` stays.
  Old URLs redirect, query and hash kept, `permanent: false` **(call)**. `/dev/messages` now redirects straight to
  `/admin/admin/messages`.
- The library page always reads with `include_not_enabled`; the link that switched it goes. The MCP route's
  `include_not_enabled` argument stays (agents use it).
- Don't touch `src/features/library/server/*`: another session has uncommitted work there. Plan "Off" is worked out on
  the page (Task 4).
- Files other sessions have changed (check `git status` before each task): `src/features/plan/ui/Tool.tsx`,
  `.claude/skills/*/SKILL.md`, `src/features/library/seed/README.md`, `tasks.txt`. Leave their `/dev/...` mentions;
  the redirects keep them working. Name them in the final report.
- Interface copy: load `design:ux-copy` and "Words about the app" in `teaching-voice` before writing any label or
  notice; report strings old → new. No exclamation marks. Copy given below is a draft for that pass.
- Every fetch has a timeout and every failure shows on the page.
- **Commits:** on main with `scripts/commit.sh "message" <paths>` (a moved file: name both old and new paths). Never
  `git add`/`git mv`/`git stash` in the main checkout; move files with plain `mv`. Messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done means: `npm test` (at least `src/features/devtools`, `src/features/admin`, `src/features/account`,
  `src/lib/publicPaths`, `src/features/messages`), `npx tsc --noEmit 2>&1 | grep -v '^.next/'` clean, eslint on changed
  files, and the pages walked in the browser (Task 6).

## Review Focus

1. **An old link with a query or hash** (`/dev/library?item=x#item`, `/dev/stories#group~2`,
   `/admin/messages?thread=<id>` from an email sent before the move): lands on the same item at the new address. →
   Task 3 test `every move keeps the rest of the path` and Task 6 browser check.
2. **Copy notes saved under an old path** (`/dev/library`, `/dev/stories#…`): still listed on their page and on
   `/admin/content/notes`, not orphaned. → Task 3 test `readCopyNotes moves a note made on a moved page`.
3. **A content-only person in production** opens `/admin`: sees only the Content card; `/admin/admin/users` and
   `/dev` 404; the Riff maker's amp list and riff list don't 404. → Task 1 tests and Task 5 riffs route test.
4. **Riff maker in production**: no Save to block / Reload from block buttons, a line saying why, and riffs still
   listed (from the bundled seed). → Task 5 tests.
5. **A failed untick on the users page**: the box goes back to ticked and the error reads right for an untick. →
   Task 2 test `the error fits a failed untick`.

---

### Task 1: Gates take any of several permissions

**Files:**
- Modify: `src/features/devtools/server/access.ts`
- Test: `src/features/devtools/server/access.test.ts`

**Interfaces:**
- Produces:
  - `type Needs = Permission | readonly Permission[]` (any one of them opens)
  - `permitted(p: Needs, account: () => Promise<Account | null>, dev?: boolean): Promise<boolean>`
  - `permissionPage(p: Needs): Promise<boolean>`
  - `permissionCheck(req: Request, p: Needs): Promise<{ ok: false; response: Response } | { ok: true; account: Account | null }>`
    — the account it looked up (null in development without a session, or without a database). In development it
    still reads the session so a route can use the account.
  - `permissionGate(req, p: Needs): Promise<Response | null>` — unchanged behaviour, now `permissionCheck` underneath.
  - `openPermissions(dev?: boolean): Promise<Permission[]>` — all three in development, else the viewer's
    `permissions` ([] when nobody or the look-up fails).

- [ ] **Step 1: Write the failing tests** in `access.test.ts`:
  - `a list opens to anyone with one of them`: `permitted(["dev","content"], async () => acct(["content"]), false)` → true; `acct(["admin"])` → false.
  - `open permissions are all three in development`: `openPermissions(true)` → `["dev","content","admin"]`.
- [ ] **Step 2: Run** `npx tsx --test src/features/devtools/server/access.test.ts` — expect FAIL (type error / wrong result).
- [ ] **Step 3: Implement** the interfaces above. `openPermissions` takes the account getter as a second optional
  parameter for the test (default `viewerAccount`).
- [ ] **Step 4: Run** the test file and `src/features/devtools/*.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(access): a gate opens to any of several permissions`.

### Task 2: /admin/admin, the hub, and the deferred users-page fixes

**Files:**
- Move (plain `mv`): `src/app/admin/{messages,users,invites}/page.tsx` → `src/app/admin/admin/{…}/page.tsx`; today's
  `src/app/admin/page.tsx` → `src/app/admin/admin/page.tsx`
- Create: `src/app/admin/admin/layout.tsx` (`permissionPage("admin")`, else `notFound()`)
- Modify: `src/app/admin/layout.tsx` (gate `["admin","content"]`), new `src/app/admin/page.tsx` (hub)
- Create: `src/features/admin/hub.ts`, `src/features/admin/hub.test.ts`; add `src/features/admin/*.test.ts` and
  `src/features/admin/*/*.test.ts` to the `test` script in `package.json`
- Modify: `src/features/admin/registry.ts` (hrefs under `/admin/admin`), `AdminNav.tsx` ("All pages" → `/admin/admin`,
  plus a link back to `/admin`), `AdminShell.tsx` if its intro needs to change
- Modify: `src/features/messages/server/mail.ts` and `messages.test.ts:24` (link → `/admin/admin/messages?thread=`)
- Delete: `src/app/dev/messages/page.tsx` (its redirect moves to Task 3's list)
- Deferred fixes: `src/features/admin/users/PermissionTicks.tsx`, `UsersTable.tsx`, `src/app/admin/admin/users/page.tsx`,
  `src/app/api/admin/users/route.ts`, `src/features/account/server/permissions.ts` (+ its test)
- Docs: `src/features/admin/README.md`, `CLAUDE.md` (paths, the hub, the `content` gate), `src/features/messages/README.md`,
  `src/features/messages/CLAUDE.md` (`/admin/messages` mentions), `src/features/account/README.md:113`

**Interfaces:**
- Consumes: Task 1's `permissionPage`, `permissionCheck`, `openPermissions`.
- Produces: `HUB_SECTIONS: { href: "/admin/content" | "/admin/admin"; label: string; desc: string; permission: Permission }[]`
  and `hubSections(open: readonly Permission[]): typeof HUB_SECTIONS` in `src/features/admin/hub.ts`.

- [ ] **Step 1: Write the failing tests**
  - `hub.test.ts`: `a content person sees only Content` (`hubSections(["content"])` hrefs → `["/admin/content"]`);
    `an admin with no content sees only Admin`; `dev alone sees nothing` (→ `[]`).
  - `permissions.test.ts`: `a signed-in person without admin may change their own row in development` — actor
    `acct({ permissions: ["dev"] })` sets own permissions to `["dev","content"]` → ok. The self rule applies only when
    the actor has `admin` (deferred fix 1).
  - `src/features/admin/users/messages.test.ts`, over a new pure `failedMessage(error: string | undefined): string`
    in `src/features/admin/users/messages.ts` (with the two strings, used by `PermissionTicks.tsx`):
    `the error fits a failed untick` (`failedMessage(undefined)` does not match `/tick/i`), `the own-admin refusal is
    named` (`failedMessage("self")` equals the SELF text).
- [ ] **Step 2: Run** those three test files — FAIL.
- [ ] **Step 3: Implement**
  - `hub.ts` and the hub page: `PageShell` with the admin frame, one card per `hubSections(await openPermissions())`.
    Draft copy: Content — "The library, the learning path, the riff maker and the other tools for writing and
    recording lessons."; Admin — "Players' messages, accounts and teacher invites." If the list is empty (dev only,
    in production) the layout already 404'd; no empty state needed.
  - The move and the two layouts. `src/app/admin/layout.tsx` gates `["admin","content"]`; `admin/admin/layout.tsx`
    gates `"admin"`. Nav tabs: AdminNav's index is `/admin/admin`; keep the "Dev tools →" link and add "Content →".
  - Deferred fixes (from the ContentVideos1 final review):
    1. `changePermissions`: the self rule fires only when `hasPermission(actor, "admin")`; `UsersTable` passes
       `self` likewise only when the viewer has admin.
    2. "Tick the box again." → a message that fits both ways, e.g. "Couldn't save the permissions. Try again."
       (`failedMessage`).
    3. `PATCH /api/admin/users` looks the session up once: use `permissionCheck(req, "admin")` and its `account`,
       drop the second `requestAccount`.
    4. The users page: `viewerAccount().catch(() => null)` inside the `Promise.all`, so a failed viewer look-up keeps
       the list (and only loses the own-row lock).
    5. The stale "only dev or an admin" comment on the users page → "the layout lets only an admin in (anyone in
       development)".
    6. Former admins on `student` getting `/players` as home (`homePage`, `account/model.ts:91`): follows the spec, **no
       change**; say so in the report and ask the user whether `admin` should send home to `/`.
- [ ] **Step 4: Run** the tests, plus `src/features/messages/*/*.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(admin): /admin hub over /admin/admin; users-page fixes` (name old and new paths).

### Task 3: /admin/content pages, the move list and the redirects

**Files:**
- Move (plain `mv`): `src/app/dev/{library,path,stories,onboarding,riff,studio,notes,block}/` → `src/app/admin/content/…`
- Create: `src/app/admin/content/layout.tsx` (`permissionPage("content")`), `src/app/admin/content/page.tsx` (index of
  `CONTENT_TOOLS`), `src/features/devtools/ContentShell.tsx`, `src/features/devtools/ContentNav.tsx`
- Create: `src/features/devtools/moves.ts`, `src/features/devtools/moves.test.ts`
- Modify: `next.config.ts` (`redirects()` adds `MOVES`), `src/features/devtools/registry.ts`, `DevNav.tsx`
- Modify links in code (grep `/dev/(library|path|stories|onboarding|riff|studio|notes|block)` outside comments):
  `library/params.ts`, `library/LibraryItem.tsx`, `model/stepHref.ts`, `block/BlockPage.tsx`, `riff/RiffLab.tsx:438`,
  `copy/CopyNotes.tsx`, `model/copyNotes.ts`, `guide/CoverageView.tsx`, `src/app/teachers/studio/page.tsx:27`, and
  their tests (`params.test.ts`, `copyNotes.test.ts`, `LibraryPage.test.tsx`)
- Modify: `src/features/devtools/model/copyNotes.ts` (`readCopyNotes` maps old routes)
- Modify: `src/features/account/loginGuard.ts` comment and `loginGuard.test.ts` if it names `/dev/stories`

**Interfaces:**
- Consumes: Task 1's `permissionPage`.
- Produces (`moves.ts`, plain data, no imports, so `next.config.ts` can import it by relative path):
  - `MOVES: readonly { from: string; to: string }[]` — the eight `/dev/*` → `/admin/content/*`, the three
    `/admin/*` → `/admin/admin/*`, and `/dev/messages` → `/admin/admin/messages`.
  - `movedPath(route: string): string` — a route (path plus optional `#hash`) with its path moved when the path is a
    `from` or under one; anything else unchanged.
- Produces (`registry.ts`): `CONTENT_TOOLS: DevTool[]` (the seven, hrefs under `/admin/content`, same labels and
  descs); `DEV_GROUPS` loses the Content group, and the Sampler goes in a new group `{ title: "Sound", tone: "stories" }`
  **(call)**. `devTitle` also finds `CONTENT_TOOLS`; a new `contentTitle(page, detail?)` ends in "· Content".

- [ ] **Step 1: Write the failing tests**
  - `moves.test.ts`: `every move keeps the rest of the path` (`movedPath("/dev/stories#group~2")` →
    `"/admin/content/stories#group~2"`; `movedPath("/dev/library")` → `"/admin/content/library"`); `the sampler and
    look-alikes stay` (`/dev/sampler`, `/dev/libraryx`, `/admin/content/library` unchanged); `old admin pages move`
    (`/admin/users` → `/admin/admin/users`, `/admin` unchanged).
  - `copyNotes.test.ts`: `readCopyNotes moves a note made on a moved page` (a note with `route: "/dev/library"` reads
    back with `"/admin/content/library"`); update the `noteHref` expectation to `/admin/content/library?item=…`.
  - `params.test.ts`: `libraryHref` builds `/admin/content/library?…`.
- [ ] **Step 2: Run** `npx tsx --test src/features/devtools/*.test.ts src/features/devtools/*/*.test.ts` — FAIL.
- [ ] **Step 3: Implement**
  - `moves.ts`, then `next.config.ts`: for each move `{ source: from, destination: to }` and
    `{ source: from + "/:path*", destination: to + "/:path*" }`, `permanent: false`. Check in the Next docs that the
    query is passed through (it is by default) — the hash stays in the browser.
  - The move, the content layout and index, `ContentShell` (`PageShell active="/admin"`, title "Content", the
    `ContentNav` tabs from `CONTENT_TOOLS` plus links "Admin →" (`/admin`) and "Dev tools →"), each moved page
    switches `DevShell` → `ContentShell` and `devTitle` → `contentTitle`. `DevNav` gets a "Content →" link.
  - `readCopyNotes` maps every note's `route` through `movedPath`; `noteHref`, the old-comments route and the
    "All pages' notes" links use `/admin/content/...`.
  - Update every code link in the list above.
- [ ] **Step 4: Run** the devtools tests, `src/lib/*.test.ts`, `src/features/account/*.test.ts` — PASS. `npx tsc`
  clean (catches a moved page's broken relative import).
- [ ] **Step 5: Docs, same commit.** `src/features/devtools/README.md`: Rules — the import rule becomes "Nothing
  outside this folder, `src/app/dev`, `src/app/admin/content` and `src/app/api/dev` imports dev tools"; the content
  tools live at `/admin/content` behind `content`; every `/dev/<moved>` heading and mention → `/admin/content/<…>`.
  `src/features/admin/CLAUDE.md`: `src/app/admin/content` is the exception to "Admin imports nothing from devtools";
  the hub and the three gates. `AGENTS.md` "Before you call it done": `/admin/content/stories`,
  `/admin/content/library?item=<id>`. Other READMEs that name a moved page (`exercises`, `intro`, `library`, `plan`,
  `teachers/studio`, `guide`) where not changed by another session.
- [ ] **Step 6: Commit** `feat(admin): /admin/content with the content tools moved out of /dev`.

### Task 4: Library lists everything, tagged

**Files:**
- Modify: `src/features/devtools/library/params.ts`, `load.ts`, `LibraryPage.tsx`
- Test: `src/features/devtools/library/params.test.ts`, `LibraryPage.test.tsx`, a new `load.test.ts` only if `offPlans`
  lives in `load.ts` (prefer a pure helper in `item.ts`)

**Interfaces:**
- Produces:
  - `LibraryParams` loses `includeNotEnabled`; `devArgs(p)` always returns `include_not_enabled: true`;
    `readParams` ignores `include_not_enabled`; `libraryHref` never writes it.
  - `LibraryData` gains `offPlans: string[]` — plan ids in the full list that are not in a second `findPlans` read
    without `include_not_enabled` (not enabled for reuse). Same scope otherwise.
  - `type LibraryTag = "seed" | "database" | "off"`; `blockTags(b: BlockSummary, seedIds: { has(id: string): boolean }): LibraryTag[]`
    and `planTags(id: string, seedIds, off: ReadonlySet<string>): LibraryTag[]`. A row has exactly one of `seed` /
    `database`, plus `off` when it isn't offered to players: a curated block (choices non-empty) with no active
    choice, or a plan in `offPlans`. A hashed block is `database` with no `off` **(call)**: it isn't a seed item, and
    whether a player sees it is ownership, not a switch.
  - Tag chips: Seed (sky, as today), "Database only" (slate), "Off" (amber).

- [ ] **Step 1: Write the failing tests** (`LibraryPage.test.tsx`)
  - `a seed block with no active choice is Seed and Off`; `a hashed block is Database only`; `a plan off for reuse is
    Off` (`PlansTable` with `off={new Set(["p1"])}`): count `>Off<`, `>Database only<`, `>Seed<` in the markup.
  - `params.test.ts`: `include_not_enabled is no longer read or written`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** `PlansTable`/`BlocksTable` take the tags; drop the "Inactive choices … include / leave
  out" sentence and link, keep the player sentence. One line above the tables says what the three tags mean (copy via
  the skills; draft: "Seed: from a seed file. Database only: no seed file (a player's or the AI's). Off: not offered
  to players."). Fix `loadItem`'s message "(show inactive ones too)", which no longer applies.
- [ ] **Step 4: Run** the library tests — PASS.
- [ ] **Step 5: Commit** `feat(library): list every block and plan, tagged Seed, Database only or Off`.

### Task 5: Pages that need this machine say so in production

**Files:**
- Modify: `src/app/api/dev/nam/route.ts`, `src/app/api/dev/commit/route.ts`, `src/app/api/dev/source/route.ts` (gate
  `["dev","content"]`), `src/app/api/dev/riffs/route.ts`, `src/features/devtools/riff/RiffLab.tsx`,
  `src/features/devtools/copy/CopyNotes.tsx`, `src/features/devtools/library/Comments.tsx` (where `useCommits()` is
  null), `src/features/devtools/riff/blocks.ts` (if the bundled read needs a helper)
- Test: `src/features/devtools/riff/blocks.test.ts`

**Interfaces:**
- Consumes: Task 1's `permissionGate(req, ["dev","content"])`.
- Produces:
  - `GET /api/dev/riffs`: gate `["dev","content"]`. In development reads the files as today; in production answers
    `{ riffs, problems, fromBundle: true }` built from `SEED_BLOCKS` through the same `riffBlockOf`. `PUT` keeps
    `devGate()` (404 in production).
  - `riffsOf(blocks: unknown[]): { riffs: RiffBlock[]; problems: string[] }` in `riff/blocks.ts`, shared by both paths.
  - `GET /api/dev/nam` answers `{ models, onThisMachine: boolean }`; `false` when neither folder exists.

- [ ] **Step 1: Write the failing test** `riffsOf lists the riffs of bundled seed blocks` (`riffsOf(SEED_BLOCKS)`
  has every seed block whose content holds a riff, sorted by id; a broken one goes to `problems`).
- [ ] **Step 2: Run** `npx tsx --test src/features/devtools/riff/blocks.test.ts` — FAIL.
- [ ] **Step 3: Implement**
  - Riff maker (interim until ContentVideos11 saves riffs to the database; keep the change small so 11 can replace
    it): when `!devOnly()`, hide Save to block and Reload from block and show one line in their place
    (draft: "Save to block writes the seed file, so it works only on a developer's computer."). The riff list comes
    from the bundle there.
  - Amp: when `onThisMachine` is false, the picker says the disk models aren't here (draft: "No amp models on this
    computer. Pick one from the amp library.") instead of an empty list; no error.
  - Commit: where `useCommits()` gives null, the Notes bar and the library comments show "Commit not known" (draft)
    instead of a blank, and Re-pin stays disabled with that as its title.
  - `/api/dev/source` stays development-only in effect (it answers nothing useful in a production build); widen its
    gate only so the content page's call isn't a 404 that shows as an error.
- [ ] **Step 4: Run** the riff tests — PASS. In development, check Save to block still writes: change one note of a
  riff whose file nobody else has open, save, see the file change, change the note back, save, and confirm
  `git status` shows that file unchanged.
- [ ] **Step 5: Commit** `feat(content): riff maker, amp models and commits say what's missing in production`.

### Task 6: Walk it in the browser

- [ ] **Step 1:** Dev server (per memory: scratch server on `127.0.0.1:3107` with the local Docker DB for signed-in
  checks; never `localhost`). With no login in development: `/admin` shows both cards; `/admin/content` index and each
  of its seven tabs render; `/admin/admin/users` ticks save.
- [ ] **Step 2:** Old links: `/dev/library?item=<a seed id>#item`, `/dev/stories#<group>~1`, `/admin/messages?thread=x`,
  `/dev/messages`, `/admin/users` land on the new pages with the query and hash.
- [ ] **Step 3:** The production gates are covered by Task 1's tests (a content-only account), not walked: a local
  production build can't fetch fonts here. Say so in the report.
- [ ] **Step 4:** Copy notes made before the move show on `/admin/content/notes` (back up and restore
  `musickit.dev.copyNotes` per memory "Keep user data in browser tests").
- [ ] **Step 5:** 390 px width: the content tabs wrap without page scroll.
- [ ] **Step 6:** Mark `ContentVideos2` `[DONE <date>]` in `tasks.txt` (commit only that hunk), and report strings
  changed old → new, what was checked and what wasn't, and the files left with `/dev/...` mentions because other
  sessions had them open.
