# A Player's Data on the Server: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in person's work and record are stored in Postgres, teachers' videos in a private Vercel Blob store, notes are shared as frozen public links, and teachers share AI autoplans as invites that give each claimer their own copy.

**Architecture:** There is a new feature folder, `src/features/userData`. It holds pure rules over a repo interface (Drizzle and memory versions), the same pattern as `features/account/server`. Thin route handlers live under `src/app/api/me`, `src/app/api/videos` and `src/app/api/shares`. On the client, each feature keeps its store interface and gets a server version, chosen by one hook: server when signed in, local when accounts are off, memory for a signed-out visitor. Videos upload straight from the browser to Blob, out of an IndexedDB queue that keeps the file until the server confirms it.

**Tech Stack:** Next.js (this repo's version, which has breaking changes; read `node_modules/next/dist/docs/` before writing route handlers), Drizzle ORM over postgres-js, `@vercel/blob` 2.8.1 (`@vercel/blob/client` for uploads), node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-11-15-account-data-on-server-design.md`. Read it before any task.

## Global Constraints

- Work on `main` in the main checkout. Other sessions share the checkout and its index. Commit only your own paths, through a temp `GIT_INDEX_FILE` (`read-tree HEAD`, add, `write-tree`, `commit-tree`, `update-ref`), then `git reset -q -- <paths>`. Never `git add` into the real index. Don't push.
- Run tests with the cached tsx: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (`npx tsx` hangs here). Add every new test glob to the `test` script in `package.json`.
- Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing. Run eslint on every changed file.
- Local DB: `npm run db:up`, then `npm run db:migrate`. Change tables only in `src/lib/db/schema.ts`, then `npm run db:generate`. Never edit an applied migration.
- Every changing route starts with `auth()` and `sameOrigin(req)` and finds the person with `requestAccount(deps, req)` (`src/features/account/server/http.ts`). It never takes a user id from the request.
- Rules files stay pure: no `Request`, no SQL. A new query is a method on the repo interface, written in both `repo.drizzle.ts` and `repo.memory.ts`, and tested over the memory one.
- Every word on screen is written after loading `design:ux-copy` and "Words about the app" in the `teaching-voice` skill. No exclamation marks. Name controls by their exact labels. Report the strings, old → new.
- The looper (`src/components/looper`, `src/lib/looper`), the sampler, NAM, device setup and the keys in the spec's "Stays in the browser" list are not touched.
- No import of old localStorage or IndexedDB data. A local store that is replaced is deleted or kept only as the no-database fallback.
- Video cap: `MAX_VIDEO_BYTES = 1024 ** 3`. Share ids: 32 random bytes as base64url (`crypto.randomBytes(32).toString("base64url")`).
- Keep each touched feature's `README.md` and `CLAUDE.md` true in the same commit.

## Review Focus

1. **Two tabs or two devices editing the same document.** Expected: last write wins, and neither tab crashes or loops. Task 4 tests that a stale save overwrites without error.
2. **A session that expires mid-visit.** A save gets 401. Expected: the "not saved" notice, not a silent drop or a retry loop that never ends. Task 4 tests that 401 stops retries and reports `signedOut`.
3. **A shared note whose video was deleted, or whose share was stopped.** Expected: the reader shows that the video is gone or the link is stopped, and the video route answers 404 for a visitor. Tasks 10 and 11 test this.
4. **A recording made while offline, and the tab closed.** Expected: it is still in the queue on the next visit and uploads then. A Download button is there the whole time. Task 9 tests the queue's states over a memory IndexedDB double.
5. **A visitor guessing ids.** A random video id, a share id of a plan used on the note route, a stopped invite. Expected: 404, never the file. Task 10 tests `canWatch` against each case.

---

## Part 1: Documents on the server

### Task 1: Tables and migration

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0002_user_data.sql` (generated)

**Interfaces:**
- Produces these tables, each with `user_id uuid not null references users(id) on delete cascade`:
  - `userDocuments`: `user_documents(user_id, kind text, data jsonb not null, updated_at)`, unique `(user_id, kind)`.
  - `progressEntries`: `progress_entries(user_id, exercise_id text, entry jsonb not null, updated_at)`, unique `(user_id, exercise_id)`.
  - `videos`: `videos(id uuid pk, user_id, title text, type text, seconds integer, width integer, height integer, size bigint, blob_path text unique, created_at)`.
  - `shares`: `shares(id text pk, user_id, kind share_kind ['note','plan'], item_id text not null, snapshot jsonb not null, created_at, stopped_at timestamptz null)`, index `(user_id, kind, item_id)`.
  - `shareVideos`: `share_videos(share_id text references shares(id) on delete cascade, video_id uuid references videos(id) on delete cascade)`, pk on the pair.
  - `planClaims`: `plan_claims(share_id text references shares(id) on delete cascade, user_id, created_at)`, pk on the pair.

- [ ] **Step 1:** Add the tables to `schema.ts`, with a one-line doc comment on each, in the file's style (`at(...)` timestamps).
- [ ] **Step 2:** Run `npm run db:generate`, rename the output to `0002_user_data.sql` if Drizzle picks another name, and read the SQL.
- [ ] **Step 3:** Run `npm run db:up && npm run db:migrate`. Expected: applies with no error. `npm run db:studio` shows the six tables.
- [ ] **Step 4:** Commit: `feat(db): tables for user documents, progress, videos, shares`.

### Task 2: Document and progress rules over a repo

**Files:**
- Create: `src/features/userData/model.ts` (kinds and parsers; pure, client-safe)
- Create: `src/features/userData/server/repo.ts`, `repo.memory.ts`, `repo.drizzle.ts`, `data.ts`
- Test: `src/features/userData/model.test.ts`, `src/features/userData/server/data.test.ts`

**Interfaces:**
- Produces, from `model.ts`:
  - `DOC_KINDS = ["plan", "note", "course_notes", "creator", "records", "about"] as const`, `type DocKind`, `isDocKind(v: unknown): v is DocKind`.
  - `parseDoc(kind: DocKind, raw: unknown): unknown`. Each kind uses its feature's existing parser:
    - `plan`: `sanitiseState` (`plan/store/localPlanStore.ts`; move it to `plan/model/state.ts` so the server can import it without `window`).
    - `note`: `parseBlock(raw, { draft: true }).block`, or null.
    - `course_notes`: `parseNotesStore` (takes a string today; add an object overload).
    - `creator`: `sanitiseKey`.
    - `records`: `{ improv: { done, best }, noteGameBest: number, lipRollAccuracy: <the shape warmUpBar stores> }`, each falling back to zero.
    - `about`: `{ level: Level, levelPages: Record<string, Level>, voice: Voice | null }`, using `readLevel`, `readOverrides` and `savedVoice`.
  - `MAX_DOC_BYTES = 512 * 1024`.
- Produces, from `server/repo.ts`, the interface `UserDataRepo`:
  - `getDoc(userId: string, kind: DocKind): Promise<unknown | null>`
  - `putDoc(userId: string, kind: DocKind, data: unknown, now: Date): Promise<void>`
  - `listProgress(userId: string): Promise<ProgressEntry[]>`
  - `putProgress(userId: string, entry: ProgressEntry, now: Date): Promise<void>`
  - `removeProgress(userId: string, exerciseId: string): Promise<void>`
  - Later tasks add more methods to this interface.
- Produces, from `server/data.ts`:
  - `readDoc(repo, userId, kind) → Promise<unknown>`: the parsed document, or `parseDoc(kind, null)` when there is none.
  - `writeDoc(repo, userId, kind, raw, now) → Promise<{ ok: true } | { ok: false; error: "too-big" | "bad-kind" }>`: parses before storing.
  - `putEntry(repo, userId, raw, now) → Promise<boolean>`: `cleanEntries([raw])[0]`, false when it's broken.

- [ ] **Step 1: Write failing tests.** In `model.test.ts`: `parseDoc("plan", null)` deep-equals `EMPTY_STATE`'s sanitised form, `parseDoc("about", { level: "nope" }).level === DEFAULT_LEVEL`, and `isDocKind("looper") === false`. In `data.test.ts`, over `memoryUserDataRepo()`:
  - `writeDoc` of a 600 KB string returns `{ ok: false, error: "too-big" }`.
  - A written plan reads back sanitised.
  - Two users' docs never cross.
  - `putEntry` twice for one exercise leaves one row.
  - `putEntry({})` returns false.
- [ ] **Step 2:** Run the tests. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `model.ts`, the repos and `data.ts`. Measure size with `JSON.stringify(raw).length`.
- [ ] **Step 4:** Run the tests. Expected: PASS. Add `src/features/userData/*.test.ts src/features/userData/server/*.test.ts` to `npm test`.
- [ ] **Step 5:** Write `src/features/userData/README.md` (what it is, its parts) and `CLAUDE.md` (the rules from Global Constraints that apply here). Commit: `feat(userData): document and progress rules over a repo`.

### Task 3: Document and progress routes

**Files:**
- Create: `src/features/userData/server/http.ts`
- Create: `src/app/api/me/documents/[kind]/route.ts`, `src/app/api/me/progress/route.ts`
- Test: `src/features/userData/server/http.test.ts`

**Interfaces:**
- Consumes `readDoc`, `writeDoc`, `putEntry` and `UserDataRepo` (Task 2), and `auth`, `sameOrigin`, `requestAccount`, `json`, `readJson`, `NO_ACCOUNTS` (account `http.ts`).
- Produces `userData(env?) → { repo: UserDataRepo } | null` (null without a database) and `signedIn(req) → Promise<{ account: Account; cookies: string[] } | Response>`. The second returns the 503, 403 or 401 response, so each route is a few lines.
- Routes:
  - `GET /api/me/documents/<kind>` → `{ data }`.
  - `PUT /api/me/documents/<kind>` with body `{ data }` → `{ ok: true }`, or 400 `{ error }`, or 413.
  - `GET /api/me/progress` → `{ entries }`.
  - `PUT /api/me/progress` with body `{ entry }` → `{ ok: true }`.
  - `DELETE /api/me/progress?exercise=<id>` → `{ ok: true }`.
  - Every answer is `cache-control: no-store`.

- [ ] **Step 1:** Read `node_modules/next/dist/docs/` on route handlers and dynamic params (`params` is a Promise here; see `src/app/note/[slug]/page.tsx`).
- [ ] **Step 2: Write failing tests** for `signedIn`, using a fake `Request` and a memory account repo the way `account/server/http.test.ts` does:
  - No cookie → 401.
  - Foreign Origin → 403.
  - No database → 503.
- [ ] **Step 3:** Run the tests. Expected: FAIL.
- [ ] **Step 4:** Implement `http.ts` and the two route files (`runtime = "nodejs"`, `dynamic = "force-dynamic"`). An unknown kind → 404.
- [ ] **Step 5:** Run the tests. Expected: PASS. Then, with the dev server running and signed in (see memory "Local login + DB"), `curl` a PUT and a GET on `plan` with the session cookie. Expected: the round trip returns the sanitised document. Without the cookie, expected: 401.
- [ ] **Step 6:** Commit: `feat(api): /api/me documents and progress`.

## Part 2: The client reads and writes the server

### Task 4: The data source and the saving client

**Files:**
- Create: `src/features/userData/client/source.ts`, `client/useDataSource.tsx`, `client/docClient.ts`, `client/SaveNotice.tsx`
- Test: `src/features/userData/client/docClient.test.ts`

**Interfaces:**
- Produces:
  - `type DataSource = "server" | "local" | "memory"`.
  - `pickSource(accountsOn: boolean, signedIn: boolean): DataSource`, which is pure. Accounts off → `local`. Signed in → `server`. Otherwise → `memory`.
  - `useDataSource(): { source: DataSource; ready: boolean }`, over `useAccount()` and `accountsOpen()`.
  - `createDocClient(opts: { put: (body: unknown) => Promise<Response>; delayMs?: number; retryMs?: number[]; now?: () => number; schedule?: (fn, ms) => cancel }): DocClient`, where `DocClient = { save(value: unknown): void; flush(): Promise<void>; status(): SaveStatus; subscribe(fn): () => void }`.
  - `type SaveStatus = "saved" | "saving" | "failed" | "signedOut"`.
  - Defaults: `delayMs = 1000`, `retryMs = [2000, 5000, 15000, 30000]` (the last one repeats).
  - `useSaveStatus(): SaveStatus`: the worst status across every live client.
  - `<SaveNotice />`, mounted once in `PageShell`. It shows only on `failed` or `signedOut`. While something is unsaved, it also registers `beforeunload`.

- [ ] **Step 1: Write failing tests** with a fake `schedule` and a fake `put`:
  - Three `save()` calls within `delayMs` → one `put`, carrying the last value.
  - `put` rejects → status `failed`, then a retry after 2000, then `saved` once a put succeeds.
  - `put` → 401 → status `signedOut`, and no further retries.
  - A `save()` during a failed retry → the newer value is the one sent ("last write wins": nothing is merged).
  - `pickSource(false, true) === "local"`, `pickSource(true, false) === "memory"`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. `flush()` sends any pending value at once. Hook it to `pagehide` with `fetch(..., { keepalive: true })`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Write the copy for `SaveNotice` (failed; signed out, with a **Log in** link to `loginHref(current path)`) using `design:ux-copy` and "Words about the app". Commit: `feat(userData): saving client, data source, save notice`.

### Task 5: Plans and progress on the server

**Files:**
- Create: `src/features/plan/store/serverPlanStore.ts`, `src/features/progress/serverProgressStore.ts`, `src/features/progress/memoryProgressStore.ts`
- Create: `src/features/userData/client/UserDataProvider.tsx`
- Modify: `src/features/plan/store/usePlan.tsx`, `src/features/progress/useProgress.tsx`, `src/features/plan/DemoPlan.tsx`, `src/components/PageShell.tsx` (or the root layout, wherever providers are mounted)
- Test: `src/features/progress/memoryProgressStore.test.ts`

**Interfaces:**
- Consumes `useDataSource`, `createDocClient` and `SaveStatus` (Task 4), and the routes from Task 3.
- Produces:
  - `serverPlanStore: PlanStore`: `load` is a GET of `plan`, and `save` goes through a `DocClient`.
  - `serverProgressStore: ProgressStore`: each `put` and `remove` is its own request, with the same retry and status behaviour as `DocClient` (reuse its retry helper; don't copy it).
  - `memoryProgressStore(): ProgressStore`.
  - `<UserDataProvider>`, which mounts `PlanStoreProvider` and `ProgressStoreProvider` with the store for the current source (`local` → today's local stores, `memory` → fresh memory stores) and renders children only once `ready`.
  - `DemoPlan` wraps its plan in a `ProgressStoreProvider` with `memoryProgressStore()` as well.

- [ ] **Step 1: Write a failing test:** `memoryProgressStore()`'s `put`/`list`/`remove` behave like `upsert`/`without` from `log.ts`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the stores and the provider. Remove `PLAN_BACKUP_KEY` and the backup logic, since nothing old is read. `localPlanStore` stays only as the `local` fallback.
- [ ] **Step 4:** Run the progress and plan tests. Expected: PASS.
- [ ] **Step 5: Check in the browser.** Signed in, make a plan and rate one exercise on `/plan`. Then clear localStorage and reload. Expected: the plan and the rating are still there. In `/demo/<slug>`, rate an exercise, then open `/plan`. Expected: the rating is not in your progress.
- [ ] **Step 6:** Update `plan/README.md`, `plan/CLAUDE.md` and `progress/README.md`. Commit: `feat(plan,progress): stored on the server for a signed-in person`.

### Task 6: The note on the server

**Files:**
- Create: `src/features/teachers/notes/model/serverNoteStore.ts`, plus a `NoteStoreProvider` and `useNoteStore()` in `model/noteStore.ts`
- Modify: `src/features/teachers/notes/NotesApp.tsx` (replace `localNoteStore` with `useNoteStore()`), `UserDataProvider.tsx`

**Interfaces:**
- Produces `serverNoteStore: NoteStore` over the `note` document, and `useNoteStore(): NoteStore` (default `localNoteStore`).
- `NotesApp` keeps its own 300 ms debounce. The `DocClient` underneath adds its retry and status.

- [ ] **Step 1:** Implement, and mount it in `UserDataProvider`.
- [ ] **Step 2:** Run `src/features/teachers/notes/model/*.test.ts`. Expected: PASS.
- [ ] **Step 3: Check in the browser.** Signed in, write a note in the notes creator, clear localStorage and reload. Expected: the note is there.
- [ ] **Step 4:** Update the notes README and CLAUDE.md. Commit: `feat(notes): the note is stored on the server`.

### Task 7: Course notes, creator key, records and "about me"

**Files:**
- Create: `src/features/userData/client/useUserDoc.ts`
- Modify:
  - `src/components/course/useCourseNotes.tsx` (`musickit.course.notes.v2`; the layout key stays local)
  - `src/features/creator/KeyProvider.tsx` (`musickit.creator.key`)
  - `src/components/improv/ImprovApp.tsx` (`musickit.improv.stats`)
  - `src/components/practice/NoteGame.tsx`, and `shared.tsx` `readBest`/`writeBest` for `musickit.noteGame.best` only
  - `src/features/exercises/basics/warmUpBar.tsx` (`musickit.lipRoll.accuracy`)
  - `src/features/guide/useLevel.tsx` (`musickit.level`, `musickit.level.page`)
  - `src/components/theory/singing/SingingApp.tsx` and `IntervalSingerApp.tsx` (`singing.range`)
- Test: `src/features/userData/client/useUserDoc.test.ts`

**Interfaces:**
- Produces `userDoc(kind: DocKind): { get(): T; set(next: T): void; subscribe(fn): () => void; loaded(): boolean }`. It's a module-level cache per kind, so it works with `useSyncExternalStore` the way `useLevel` and `useCourseNotes` already do. It loads once per page from the current source:
  - `server`: GET, then a `DocClient`.
  - `local`: the old localStorage key.
  - `memory`: nothing is kept.
- Also `useUserDoc<T>(kind): [T, (next: T) => void, boolean]`.
- `records` and `about` are each one document that several components update in part: `set` always takes the whole document, and callers spread.

- [ ] **Step 1: Write failing tests** over a fake source:
  - Two subscribers see one `set`.
  - Before loading, `get()` returns `parseDoc(kind, null)`.
  - A `set` before the load finishes is not overwritten by the load.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement `useUserDoc.ts`, then move each listed key onto it, one component at a time. Synchronous readers (`SingingApp`'s voice, `readBest`) read the cached value and update when it loads, as `useLevel` already does after hydration.
- [ ] **Step 4:** Run the tests for guide, course, creator and practice. Expected: PASS.
- [ ] **Step 5: Check in the browser.** Signed in, change the level on one page, pick a voice in the singing tools, finish an improv round and pick a creator key. Clear localStorage and reload each page. Expected: each one comes back.
- [ ] **Step 6:** Update the READMEs and CLAUDE.md of each touched feature. Commit: `feat(userData): course notes, creator key, records and about me follow the account`.

## Part 3: Videos

### Task 8: Video rules, upload and serving

**Files:**
- Create: `src/features/videos/server/rules.ts`, and the repo methods in `src/features/userData/server/repo*.ts`
- Create:
  - `src/app/api/videos/upload/route.ts` (client-upload token)
  - `src/app/api/videos/route.ts` (`GET` list, `POST` complete)
  - `src/app/api/videos/[id]/route.ts` (`PATCH` rename, `DELETE`)
  - `src/app/api/videos/[id]/file/route.ts` (`GET` stream)
- Test: `src/features/videos/server/rules.test.ts`

**Interfaces:**
- Produces, from `rules.ts`:
  - `MAX_VIDEO_BYTES = 1024 ** 3`.
  - `VIDEO_TYPES = /^video\/(webm|mp4)(;.*)?$/`.
  - `videoPath(userId: string, id: string, type: string): string`, which gives `videos/<userId>/<id>.<webm|mp4>`.
  - `ownsPath(userId, path): boolean`.
  - `checkUpload({ id, type, size }): { ok: true } | { ok: false; error: string }`. The id must be a UUID.
- `UserDataRepo` adds:
  - `createVideo(row: VideoRow): Promise<boolean>` (false if the id is taken)
  - `listVideos(userId)`
  - `getVideo(id)`
  - `renameVideo(userId, id, title)`
  - `deleteVideo(userId, id): Promise<VideoRow | null>`
  - `canWatch(viewerId: string | null, videoId: string): Promise<VideoRow | null>`. Task 10 fills in the share part. Until then it is owner only.
- Decision: the **client picks the video id** (`crypto.randomUUID()`, as `store.ts` does today), and the server uses it as the row's id. A note's `VideoRef` keeps the same id before and after upload, so nothing is rewritten.
- Upload flow:
  1. `upload()` from `@vercel/blob/client` with `access: "private"` and `handleUploadUrl: "/api/videos/upload"`.
  2. The token route checks `signedIn` and `checkUpload`, and sets `allowedContentTypes`, `maximumSizeInBytes: MAX_VIDEO_BYTES` and the pathname from `videoPath`.
  3. When it finishes, the client `POST`s `/api/videos` with `{ id, title, type, seconds, width, height, path }`. The server checks `ownsPath`, confirms the blob with `head()`, and writes the row. Don't rely on `onUploadCompleted`, because the webhook can't reach localhost.
- Serving: `GET /api/videos/<id>/file` → `canWatch` → `get(path, { access: "private", token: blobToken(env), headers: range ? { range } : undefined })`. Forward the status (200 or 206) and the `content-range`, `content-length`, `accept-ranges` and `content-type` headers, with `cache-control: private, no-store`.

- [ ] **Step 1: Write failing tests** for `rules.ts`:
  - `checkUpload` rejects `image/png`, a size of `MAX_VIDEO_BYTES + 1` and a non-UUID id.
  - `ownsPath("u1", "videos/u2/x.webm") === false`.
  - `videoPath("u1", id, "video/webm;codecs=vp9,opus")` ends in `.webm`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the rules, the repo methods (memory and Drizzle) and the routes. Reuse `blobToken` from `nam/server/cloud.ts`; move it to `src/lib/blob.ts` if both features need it.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Spike against the real store.** Upload a 20 MB webm through the flow. Then `curl -H 'Range: bytes=0-99' -b <cookie> /api/videos/<id>/file -i`. Expected: `206`, with `content-range: bytes 0-99/…`. If Blob's `get` ignores the range, stop and report back with what it returned. Don't build a workaround.
- [ ] **Step 6:** Commit: `feat(videos): private upload to Blob, a row per video, a ranged stream`.

### Task 9: The upload queue and the video UI

**Files:**
- Modify: `src/features/videos/store.ts` (it becomes the queue), `VideoPlayer.tsx`, `VideoChooser.tsx`, `VideoRecorder.tsx`
- Create: `src/features/videos/queue.ts` (pure state), `src/features/videos/serverVideos.ts` (list, rename, delete, upload over the API)
- Test: `src/features/videos/queue.test.ts`

**Interfaces:**
- Produces:
  - `type QueuedVideo = SavedVideo & { state: "waiting" | "uploading" | "failed"; tries: number; error?: string }`.
  - From `queue.ts`, pure: `nextToUpload(list): QueuedVideo | null`, `afterFailure(v, error): QueuedVideo`, `afterSuccess(list, id): QueuedVideo[]` (drops it).
  - From `store.ts`: `enqueue(v)`, `listQueued()`, `markQueued(id, patch)`, `dropQueued(id)`. These are the existing `saveVideo`/`listVideos`/`deleteVideo` renamed, with `state` added.
  - From `serverVideos.ts`: `uploadQueued(v: QueuedVideo): Promise<void>`, `listServerVideos()`, `renameServerVideo`, `deleteServerVideo`, `videoFileUrl(id) = /api/videos/<id>/file`.
  - `useVideoLibrary(): { videos: (SavedVideoInfo & { uploaded: boolean; state?: QueuedVideo["state"] })[]; retry(id); download(id); rename; remove }`. It merges server videos with the queue, queued ones first.
- Behaviour, from the spec:
  - Saving a take enqueues it first, then uploads.
  - The local copy is dropped only after `POST /api/videos` succeeds.
  - On every page load with `source === "server"`, everything still queued is uploaded, one at a time.
  - A failed upload shows its state with **Try again** and **Download**. Every video that hasn't uploaded has **Download**.
  - Leaving during an upload triggers `beforeunload`.
  - If `enqueue` returns null (storage refused), the recorder warns before the upload starts that the take will be lost if it fails, and keeps **Download** in view.
  - `VideoPlayer` plays a queued video from its local blob and an uploaded one from `videoFileUrl`.
  - With `source !== "server"`, today's local-only behaviour stays.

- [ ] **Step 1: Write failing tests** for `queue.ts`:
  - `nextToUpload` skips `uploading` and takes the oldest `waiting` or `failed`.
  - `afterFailure` sets `failed` and increases `tries`.
  - `afterSuccess` removes only that id.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Write the copy (not uploaded yet, upload failed, **Try again**, the storage-refused warning) using `design:ux-copy` and "Words about the app".
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Check in the browser.** Signed in, record a take with the network set to offline in DevTools. Expected: it shows as not uploaded, with **Download**. Close the tab, go back online and reopen the notes creator. Expected: it uploads and plays from the server. Clear IndexedDB. Expected: it still plays.
- [ ] **Step 6:** Update `videos/README.md` and `CLAUDE.md`. Commit: `feat(videos): an upload queue that never loses a take`.

## Part 4: Sharing

### Task 10: Share rules and the watch check

**Files:**
- Create: `src/features/userData/server/shares.ts`, plus repo methods
- Test: `src/features/userData/server/shares.test.ts`

**Interfaces:**
- `UserDataRepo` adds:
  - `createShare(row: ShareRow, videoIds: string[]): Promise<void>`
  - `getShare(id): Promise<ShareRow | null>`
  - `listShares(userId, kind, itemId): Promise<ShareRow[]>` (live ones only)
  - `stopShare(userId, id, now): Promise<boolean>`
  - `claimPlan(shareId, userId, now): Promise<"new" | "again">`
  - `deleteAllForUser(userId): Promise<{ blobPaths: string[] }>`
- `ShareRow = { id; userId; kind: "note" | "plan"; itemId; snapshot: unknown; createdAt; stoppedAt: Date | null }`.
- Produces, from `shares.ts`:
  - `videoIdsIn(snapshot: unknown): string[]`: every `{ source: "recording", id }` ref anywhere in the JSON, found by walking it.
  - `shareNote(repo, account, now, newId) → { id }`: snapshots the `note` document. `itemId = "note"`.
  - `sharePlan(repo, account, now, newId) → { id } | { error: "not-allowed" | "no-plan" }`: needs `can(account, "sharePlan")`. The snapshot is `{ config }` of the current plan only. `itemId` is the plan id.
  - `openNoteShare(repo, id) → ShareRow | null`: null when it's stopped, or when it's a plan share.
  - `claimInvite(repo, account, id, now) → { ok: true; planId } | { error: "stopped" | "not-found" }`:
    - A new claim adds `{ id: newPlanId, config, startedOn: localDate(), done: {}, from: shareId }` to the claimer's plan document. It becomes `current` when there is none, and otherwise goes to the front of `history`.
    - A second claim adds nothing and returns the existing plan's id.
  - `canWatch` (completing Task 8): owner, or the video is in `share_videos` of a live note share, or of a plan share in `plan_claims` for this viewer (stopped or not, because a claimed copy keeps working).
- `FEATURES` in `src/features/account/model.ts` gains `sharePlan: ["teacher", "owner"]`.

- [ ] **Step 1: Write failing tests** over the memory repo:
  - `videoIdsIn` finds two refs nested in cells and skips library refs.
  - A visitor (`null`) can watch a video in a live note share, and not after `stopShare`.
  - A visitor can't watch a video in no share.
  - A plan share's video is not watchable through the note route (`openNoteShare` returns null for it).
  - A student gets `not-allowed` from `sharePlan`.
  - `claimInvite` twice gives one plan, and the claimer can watch the plan's video.
  - After `stopShare`, a new claimer gets `stopped`, and the old claimer can still watch.
  - Deleting a video makes `canWatch` return null everywhere.
  - Two users never see each other's shares in `listShares`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Add `from?: string` to `StoredPlan` in `plan/model/types.ts` and keep it through `sanitiseState`.
- [ ] **Step 4:** Run the userData, plan and account tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(shares): frozen note shares, plan invites, the watch check`.

### Task 11: Note sharing, end to end

**Files:**
- Create:
  - `src/app/api/shares/route.ts` (`POST { kind, itemId? }`, `GET ?kind=&item=`)
  - `src/app/api/shares/[id]/route.ts` (`GET` a note share, public; `DELETE` stops it, for the owner)
  - `src/app/notes/shared/[id]/page.tsx`
- Modify:
  - `src/lib/publicPaths.ts`: add `/notes/shared` to the public list and `/api/videos/` stays under `/api`. Update `publicPaths.test.ts`.
  - `src/features/teachers/studio/SharePopover.tsx`: becomes real. It has a **Share** action, the new link with **Copy link**, and the item's live links, each with its date and **Stop**. It keeps **View as a note**.
  - `NotesApp.tsx`: drop the `#note=` branch.
  - `note.ts`: drop `noteFromHash` and its encoder if nothing else uses them.
  - `StudioApp.tsx`: **Share as a note** builds the note and shares it.
  - `src/features/account/loginGuard.ts` and `ui/LoginGuard.tsx`: remove the hash stash if nothing else uses it.
- Test: the routes' guard logic is already covered (Task 3). Add `publicPaths.test.ts` cases.

**Interfaces:**
- Consumes `shareNote`, `openNoteShare`, `listShares` and `stopShare` (Task 10).
- The shared page renders `NoteReader` over the snapshot, inside a memory `UserDataProvider`. Its videos play from `videoFileUrl`. A stopped or unknown link renders a short notice (copy via ux-copy) with status 404.

- [ ] **Step 1: Write failing tests:** `isPublicPath("/notes/shared/abc") === true` and `isPublicPath("/notes") === false`.
- [ ] **Step 2:** Run them. Expected: FAIL. Then implement, and expect PASS.
- [ ] **Step 3:** Implement the routes, the page and the popover. Write the popover copy, the stopped-link copy and the gone-video copy with `design:ux-copy` and "Words about the app".
- [ ] **Step 4: Check in the browser.** As a signed-in teacher, share a note that has a recording. Open the link in a private window (signed out). Expected: the note reads, and the video plays and seeks. Edit the note, then reload the link. Expected: the change isn't there, because the share is frozen. **Stop** it, then reload. Expected: the stopped notice, and the video URL returns 404.
- [ ] **Step 5:** Update the notes, studio and account READMEs and CLAUDE.md. Commit: `feat(notes): share a note as a frozen public link`.

### Task 12: Plan invites

**Files:**
- Create: `src/app/api/shares/[id]/claim/route.ts` (`POST`), `src/app/plan/invite/[id]/page.tsx`
- Modify: `src/features/plan/PlanApp.tsx` (the Share plan button and popover)

**Interfaces:**
- Consumes `sharePlan`, `claimInvite` and `can("sharePlan")`.
- The invite page is not public. The proxy and `LoginGuard` already send a signed-out visitor to `/login?next=/plan/invite/<id>`. Change the login page's heading for that `next` to the "Create your account or log in to view" line (copy via ux-copy). Once signed in, the page `POST`s the claim and replaces itself with `/plan`. A stopped or unknown invite shows a notice.
- Share plan:
  - With `can("sharePlan")`: the real popover (Task 11's component, with `thing="a plan"`) makes an invite link and lists the live ones with **Stop**.
  - Without it: the popover shows **Upgrade to Teacher account**, one line on what a teacher account does, and a link to `/kickstarter`.

- [ ] **Step 1:** Implement the route, the page and the popover branches. Write the copy with `design:ux-copy` and "Words about the app".
- [ ] **Step 2:** Run the plan, account and userData tests. Expected: PASS.
- [ ] **Step 3: Check in the browser.** Use two accounts. Set one to `teacher` in `db:studio`.
  - As the teacher, share the plan.
  - As the student, in another browser profile, open the link signed out. Expected: login, then back to the invite, then the plan in `/plan`.
  - Open the link again. Expected: no second copy.
  - The teacher stops the invite, and a third account opens it. Expected: the stopped notice.
  - The student clicks Share plan. Expected: **Upgrade to Teacher account**.
- [ ] **Step 4:** Update the plan README and CLAUDE.md. Commit: `feat(plan): teachers share a plan as an invite`.

### Task 13: Account deletion and the closing docs

**Files:**
- Modify: `src/app/api/account/route.ts` (`DELETE`), `src/features/account/CLAUDE.md`, `src/features/account/README.md`, `AGENTS.md` only if a repo-wide rule changed (it shouldn't)

**Interfaces:**
- Consumes `deleteAllForUser` (Task 10), which returns the blob paths. The route deletes them with `del(paths, { token })` from `@vercel/blob`, then calls `deps.repo.deleteUser`, and the cascade does the rows.

- [ ] **Step 1: Write a failing test** in `shares.test.ts`: `deleteAllForUser` returns every video path of that user and none of another's.
- [ ] **Step 2:** Run it. Expected: FAIL. Implement, and expect PASS.
- [ ] **Step 3:** In `account/CLAUDE.md`, replace "A visitor's stored data never moves … has to carry the old data over" with the new rule: a signed-in person's data is on the server, device setup stays in the browser, and old browser data was dropped with no import (2026-11-15). Update the README's parts list.
- [ ] **Step 4: Run everything.** `npm test` with the cached tsx, the `tsc` line, and eslint on all changed files. Expected: all clean.
- [ ] **Step 5: Check in the browser.** Delete a test account that has a video and a share. Expected: the share link shows the stopped notice, and the video URL returns 404.
- [ ] **Step 6:** Commit: `feat(account): deleting an account removes its data and files`.
