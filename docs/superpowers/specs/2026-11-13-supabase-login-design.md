# Log in with Supabase; signed-in notes and plans in the database, shared by link (design)

Status: waiting for approval. Nothing is built.

## Why

The app is a demo that anyone can use without an account; everything a visitor makes lives in their browser. The
next step is accounts that hold what a person makes, so a note or a plan can be sent to someone else as a link (the
Share buttons on the notes creator and the plan page say today that sharing isn't open). Later, notes and plans will be
bundled into groups ("courses"), and later still visitor mode will go; neither is part of this project, but the data
must not make them hard.

The user's words: "No logged in user still should have full experience using browser storage ... same as now";
"a router component that will route logged in users to API and DB and not logged in to local storage"; "we will use
supabase"; "sign in button always visible"; "notes and plans they create are saved in DB and they can share them via
link"; "it's still demo so we don't need to migrate progress"; "lets keep visitor mode for now".

## What exists today

- `src/features/account`: our own sign-in (email link + Google, PKCE), its own tables (`users`, `identities`,
  `sessions`, `auth_tokens` in `src/lib/db/schema.ts`, Drizzle, `DATABASE_URL`), `useAccount()` → `{ account, loaded,
  can }`, roles student / teacher / owner, the screens `/login`, `/register`, `/register/teacher`, `/login/confirm`,
  `/register/finish`, `/account`, and `AccountLink` in `SiteNav`. With no `DATABASE_URL` there are no accounts and
  the nav shows no Log in. Read `src/features/account/README.md` and `CLAUDE.md` first.
- Plans: `PlanStore` (`load()` / `save(state)` of one `PlanState`: `answers`, `current`, `history`, `reminder`),
  `localPlanStore`, `PlanStoreProvider` + `usePlan()`. The interface was written for an API store to drop in.
- Notes: the notes creator (`/teachers/studio?notes=1`, `StudioApp` with `notes`) keeps **one** working note in
  localStorage through `useStage`. A note opened from a link is read in `NoteView`; `encodeNote` / `noteFromHash`
  put a whole note in a URL hash. The notes format is moving to the block format
  (`docs/superpowers/specs/2026-11-12-blocks-notes-plan-merge-design.md`); this project stores a note as an opaque
  JSON document and must not care which format it is.
- Share buttons: `SharePopover` on both pages says sharing isn't open yet. `tasks.txt` (NEW1) asks for it to say
  "log in to share your note / plan".

## Goals

1. **Supabase Auth is the sign-in.** Google and email link, through Supabase. The user puts the keys in `.env`.
2. **Visitors are untouched.** Not signed in, every page works exactly as today, from browser storage, with no
   notice or disclaimer about accounts.
3. **One router decides where data goes.** A single component looks at `useAccount()` and gives every data store
   below it either the browser version or the API version. Screens never ask whether someone is signed in to decide
   where to save; they talk to a store interface.
4. **Signed in, notes and plans live in the database**, through our own API routes (Next route handlers), reached
   from the browser only through those routes.
5. **A signed-in person has a list of saved notes**, each its own item, and can open, rename, delete and start a new
   one. Plans keep today's shape (current plan + history), each plan its own item.
6. **Share by link.** A signed-in person's note or plan can be shared: Share copies a link anyone can open, without
   an account, read-only.
7. **The sign-in button is always visible** in the top nav on every page, for visitors; signed in, it is the
   person's name (to `/account`), as today.

## Non-goals

- Courses (bundles of notes and plans). Out of scope; only the data shape keeps the door open (notes and plans are
  rows with their own ids and owners).
- Carrying a visitor's browser data into a new account. Signing in starts with an empty account; signing out shows
  the browser's own data again, untouched.
- Removing visitor mode.
- Removing our own sign-in code and tables. They are unplugged from the screens in this project and deleted in a later
  cleanup (the user: "remove it later").
- Videos in the AI plan, business libraries, video tags (see Videos, "Later").
- Progress log, course notes (`useCourseNotes`), device and page settings (volume, theme, inputs, layouts): they stay
  in the browser for everyone.
- Editing someone else's shared note or plan, comments, sharing with named people, teachers assigning to students.
- Role-gated features (`can` exists; no screen uses it yet, and this doesn't change that).

## Anti-goals

- A visitor seeing anything new: a banner, a nag, a slower page, a request to the server on load.
- A screen that branches on "signed in?" to pick storage. That is the router's job alone.
- Data that is guessable or listable by a stranger: a shared item is reachable only by its unguessable id, and an
  unshared one not at all.
- Two sign-ins live on the screen at once.
- Losing edits: a signed-in edit that silently fails to save.

## How it is made (decided)

### Auth: Supabase

- Packages: `@supabase/supabase-js` and `@supabase/ssr` (cookie sessions for the Next App Router).
- Env (to `.env.example`, user fills `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (Supabase's publishable/anon key), and `DATABASE_URL` set to the Supabase Postgres connection string (the pooler
  URL) for Drizzle.
- `src/proxy.ts` (Next 16 renamed middleware to proxy; read `node_modules/next/dist/docs/01-app/03-api-reference/
  03-file-conventions/proxy.md` and `02-guides/authentication.md`) refreshes the Supabase session cookie, as the
  `@supabase/ssr` guide does. Its matcher must skip static files and must not slow a visitor: with no Supabase cookie
  it returns at once.
- Sign-in methods: **Google** (`signInWithOAuth`, enabled in the Supabase dashboard) and **email link**
  (`signInWithOtp`). Keep the existing rule that a mailed link does nothing alone: the email template points at
  `/login/confirm?token_hash=…&type=email`, which shows one Continue button that calls `verifyOtp`. Callback route
  for Google: `/auth/callback` (exchange the code, then `safeNext`).
- **Profile and role**: a `profiles` table keyed by the Supabase user id (`auth.users.id`): `name`, `role`
  (the existing `user_role` enum), timestamps. A signed-in person with no profile row lands on `/register/finish`
  (name and role), as today; `/register` and `/register/teacher` pass the role through so a new person who came from
  there skips that step's role pick.
- `useAccount()` keeps its shape (`{ account, loaded, can }`, `Account` = id, name, email, role). A new
  `supabaseAccountStore` (implements `AccountStore`) replaces `serverAccountStore` as the default; `current()`
  returns null at once when there is no Supabase session cookie, so visitors make no request. `signOut()` signs out
  of Supabase. Screens keep calling `useAccount()` only.
- The existing screens (`LinkForm`, `ConfirmLink`, `FinishSignup`, `AccountPanel`) are kept and rewired to Supabase.
  `/api/auth/*` and our own sign-in tables stay in the repo, unused, until the cleanup; nothing on screen reaches them.
- `accountsOpen()` becomes "the Supabase env vars are set". **`AccountLink` always shows Log in for a visitor**,
  also before `loaded` (a visitor is the default until a session is known; a signed-in person may see Log in flash
  for an instant, which is accepted). With Supabase not configured, Log in still shows and `/login` says accounts
  aren't open, as today.

### Data: our API over Supabase Postgres

- Tables (Drizzle, `schema.ts`, a new migration):
  - `notes`: `id` uuid pk, `owner_id` uuid (→ profiles), `title` text, `doc` jsonb (the note as the notes creator
    stores it), `shared` boolean default false, `created_at`, `updated_at`. Index on `(owner_id, updated_at)`.
  - `plans`: `id` uuid pk (the `StoredPlan.id`, or a new uuid), `owner_id`, `doc` jsonb (the whole `StoredPlan`:
    config and the owner's own ticks, ratings, timer), `is_current` boolean, `shared` boolean, timestamps.
  - `plan_settings`: `owner_id` pk, `answers` jsonb, `reminder` jsonb.
  - **Owners point at the Supabase user** (my call): `owner_id` on `notes`, `plans` and `plan_settings`, and
    `profiles.id`, are foreign keys to `auth.users(id)` with `on delete cascade`, written by hand in the migration SQL
    (Drizzle doesn't see the `auth` schema). So a person can save before finishing `/register/finish`.
  - **Migrations on Supabase** (my call): the existing `drizzle/0000_accounts.sql` runs on the Supabase database as it
    is (its old tables sit unused until the cleanup); the new migration reuses its `user_role` enum.
  - RLS is switched on for these tables with **no policies**, so the anon key reaching Postgres through Supabase's own
    REST API reads and writes nothing; only our server (via `DATABASE_URL`) touches them.
- Routes (`src/app/api/notes`, `src/app/api/plans`, `src/app/api/shared`): every route gets the person from the
  Supabase session on the server (`supabase.auth.getUser()`, never an id from the body), checks `sameOrigin` on
  writes, and only ever reads or writes rows with `owner_id` = that person. Shared reads (`GET /api/shared/note/:id`,
  `/api/shared/plan/:id`) need no session and return the item only when `shared` is true, without owner data beyond
  the name.
- The routes keep the account feature's shape: rules in a pure module with a repo interface, `repo.drizzle.ts` and
  `repo.memory.ts`, tests over the memory repo.

### The router

- A `DataRouter` client component, mounted once in the root layout below the account provider. It reads
  `useAccount()` and provides the stores: `PlanStoreProvider` with `localPlanStore` or `apiPlanStore`, and a new
  `NoteStoreProvider` with `localNoteStore` or `apiNoteStore`. Until `loaded`, it provides the local stores (what a
  visitor gets); when the account arrives the stores swap, and the hooks reload from the new store (they already
  depend on the store in their effects).
- Signing out swaps back to the local stores: the browser's own data shows again.
- A new store kind added later (progress, courses) is one more line in the router.

### Notes store

- `NoteStore`: `list()` → summaries (id, title, updatedAt, shared), `get(id)`, `save(note)` (create or update),
  `remove(id)`, `share(id, on)` → the link.
- `localNoteStore` is **today's single working note** behind that interface (a list of one; `share` is not
  available). Visitors see no change.
- Signed in, the notes creator gains a small **My notes** control: the list, New note, open, delete. The editor edits
  the open note; saves go to the store (debounced, see Saving).
- **Title** (my call): not separate data. The note's title is its heading as today (`noteHeader()`); the `title`
  column is a copy taken from the doc on each save, for the list. Renaming is editing the heading.
- **What opens** (my call): signed in, the notes creator opens the last edited note. An empty account shows a blank
  note, and the row is created on the first edit, not on load (no empty rows).
- **A hash link while signed in** (my call): opens read-only in `NoteView`, as today, and saves nothing. Nothing is
  written over the open note.
- The notes creator must keep working for a visitor exactly as now: the list UI appears only when the store has more
  than the single working note to offer (the API store), not by checking the account.

### Plans store

- `apiPlanStore` implements the existing `PlanStore` (`load` / `save` of a whole `PlanState`). The client sends the
  state; the server splits it into `plans` rows and `plan_settings`. `usePlan()` and the plan screens don't change.
- `PlanStore` gains `share(planId, on)` → the link; the local store has none.
- `usePlan()` is also called inside every exercise tool, so `apiPlanStore` caches the loaded state and shares one
  load and one pending save among them (builder's note, accepted).

### Sharing

- Share on the notes creator and the plan page, signed in: turns `shared` on, copies the link, and the popover says
  the link was copied, with Stop sharing. Visitor: the popover says to log in to share, with a Log in link that comes
  back to the page (`next`) (tasks.txt NEW1).
- Links: `/n/<id>` for a note and `/p/<id>` for a plan. A note opens read-only in `NoteView`. A plan opens read-only:
  the seven days and their exercises as the plan page draws them, without the owner's ticks, ratings or timer, and
  with no editing. A stopped or missing share shows a plain not-found.
- The existing hash links (`encodeNote` / `noteFromHash`) keep working as they do now.

### Saving

- API stores debounce writes (about 1 s after the last change, and on `pagehide` with `keepalive`), because the plan
  timer saves `elapsed` every few seconds.
- A failed save is shown: a small notice near Share saying the change wasn't saved, with Try again. Edits stay in
  memory until saved.

### Videos

The user (2026-11-13): "videos should be uploaded to blob storage", "we also need a DB record for videos", and for visitors
"just use local storage or disable feature showing 'log in to'".

- **Signed in:** a recording made in the notes creator (Add a video → Record) is uploaded to Vercel Blob (the repo already
  uses `@vercel/blob`, `MUSICKIT_BLOB_READ_WRITE_TOKEN`), straight from the browser with `@vercel/blob/client` `upload()`
  and a token route (`/api/videos/upload`, signed-in only, content type `video/*`, size cap 500 MB), so the file never
  passes through a server function. Private access; played through `/api/videos/<id>/file` (owner, or anyone holding a
  shared note that uses it).
- **A `videos` row** per upload: `id` uuid, `owner_id` (→ `auth.users`), `blob_path`, `title`, `duration_s`, `size`,
  `content_type`, `created_at`. RLS on, no policies, as the other tables.
- **The note** holds `{ "type": "video", "ref": { "source": "upload", "id": "<videos.id>" } }` (plan 4 added the
  `recording` and `placeholder` sources). My Videos lists the signed-in person's rows instead of the browser's.
- **Visitors:** recording stays in the browser (IndexedDB), as today, with no notice. Signing in does not move those
  recordings (no data moves, as for notes and plans).
- **Later, not now:** a video library per business (a `business_id` on the row), tags on a video so the AI plan can pick
  one in context (videos are not offered to the AI plan for now), and recording in the video studio into the same table.

## Words on the screen

All new strings are interface copy: written with `design:ux-copy` and "Words about the app" in `teaching-voice`
(`AGENTS.md`). Log in, Log out, Create account, the same everywhere. Report the strings old → new.

## Left to the builder

- Exact component split of My notes, its placement in the notes creator's page bar, and its look (match the page).
- How `apiPlanStore` diffs a state into rows (whole-state upsert is fine for a demo).
- The Supabase dashboard setup (Google provider, redirect URLs, the email template) is a checklist in the account
  README that the user follows; the code assumes a project they made.
- Supabase email template text (following the words rules) and the dashboard settings list in the account README.
- Debounce timing and the shape of the saved/failed notice.

## Done when

- A visitor: every page as today; no new request on load; Share says to log in.
- Sign in with Google and with an email link against a real Supabase project; sign out.
- Signed in: make two notes, reload, both there; edit the plan, reload, kept; another browser signed in to the same
  account sees them.
- Share a note and a plan; open the links in a private window; Stop sharing; the links stop.
- Another signed-in account cannot read or change the first one's unshared items (route tests over the memory repo,
  and one check by hand).
- Tests, `tsc`, eslint on changed files; the account `README.md` and `CLAUDE.md` and the plan and studio docs updated;
  `.env.example` lists the Supabase vars.
