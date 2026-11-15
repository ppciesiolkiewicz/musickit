# A player's data on the server

Date: 2026-11-15. Status: draft for review.

## Why

The app is heading for release. Every tool page already needs a login (`src/lib/publicPaths.ts`), but everything a
player makes or earns still lives in their browser's localStorage and IndexedDB. A cleared cache, a second device or a
new browser loses it, and a teacher's recorded video plays only in the browser that recorded it. Postgres (Drizzle,
`src/lib/db`) holds only accounts and sessions today.

After this work, a signed-in person's work and record live on the server and follow the account to any device. Things
that only describe this device stay in the browser.

## Goals

1. The player's work and record are stored in Postgres, owned by their account (list below).
2. Teachers' videos are uploaded to Vercel Blob, with a database row each.
3. Notes can be shared as a frozen, public, read-only link. Teachers share an AI autoplan as an invite: whoever logs in
   through it gets their own copy.
4. Everything is private to its owner unless it's shared.

## Non-goals

- **The looper is out entirely.** Its boards, windows, widgets and MIDI stay as they are.
- **No import of old browser data.** Existing localStorage and IndexedDB data is dropped (the owner clears their own
  cache). This reverses the rule in `src/features/account/CLAUDE.md` ("Putting a real account's data somewhere else is
  the data move, and it has to carry the old data over"). That line is rewritten in the same change.
- Sampler samples and NAM amp models stay in IndexedDB. (My call, from "some things stay in the browser". Easy to
  revisit.)
- No offline mode or editing while offline, no live collaboration, no merging of edits made on two devices at once.
- No studios, classes or rosters. A plan invite gives a copy and nothing more: the teacher doesn't see who claimed it
   or their progress.
- No real upgrade to a teacher account. "Upgrade to Teacher account" only explains and links to the offer.
- No storage quotas or billing.

## Anti-goals (a failure even if it works)

- A person can read or watch someone else's private data, or reach a video that isn't in one of their own items or a
  live share. Guessing an id must not be enough.
- A save fails without the player knowing.
- A recording is lost because its upload failed.
- Device setup (a MIDI device id, a window position) follows the account to another machine, where it means nothing.

## What moves and what stays

### Moves to the server (follows the account)

| Data | Today | Shape on the server (my call) |
| --- | --- | --- |
| AI autoplan and plans | `musickit.plan`, `musickit.plan.backup` via `PlanStore` | one document per user |
| Progress (exercise ratings) | `musickit.progress` via `ProgressStore` | rows, one per user and exercise |
| Interactive notes | `musickit.note` via `NoteStore` | one document per user (one note today) |
| Course notes | `musickit.course.notes.v2` (`useCourseNotes`) | one document per user |
| Creator key | `musickit.creator.key` | one document per user |
| Improv stats, note game best, lip roll accuracy | `musickit.improv.stats`, `musickit.noteGame.best`, `musickit.lipRoll.accuracy` | one "records" document per user |
| Level, per-page levels, singing voice range | `musickit.level`, `musickit.level.page`, `singing.range` | one "about me" document per user |
| Teachers' videos | IndexedDB `musickit-videos` | the file in Vercel Blob, a row in `videos` |

Level and voice range describe the player, not the device, so they move. (My call.) The plan's own `answers.voice` stays
inside the plan document. It is not merged with `singing.range` in this round. `SingingApp` and `IntervalSingerApp` read
the range synchronously today and become async readers.

### Stays in the browser

Theme, volume, audio devices and inputs, tuner and camera choices, window and panel positions and folds, the settings
panel's place, the tour and "seen" flags, label system and chord label choices, tool knob settings (backing,
practiceBand, jam, drone, pocket, rhythm, creator views and plugins), the creator board (`musickit.creator.board` is
the widget layout, not content), the studio stage (`musickit.studio.stage`, a layout of live widgets; a video widget on
it points at a server video and simply shows nothing if that video is gone), the half-finished plan flow
(`musickit.plan.flow`, sessionStorage), devtools data, `musickit.loginHash`, the looper, the sampler and NAM.

Label and chord label choices and the tool knob settings sit on the line between "about me" and "this device". My call
is to keep them in the browser for this round; the builder may move one if it turns out to be part of a moved document.

## How it behaves

- **Loading.** A page asks the server for the signed-in person's data. Until the answer arrives it shows its loading
  state, as the async stores already allow for. The server is the only copy, with no local cache.
- **Saving.** The store saves on change, debounced (the builder picks the delay, around a second). The last write wins,
  per document.
- **A failed save.** The player sees a notice saying it wasn't saved, and the app retries. Leaving the page with an
  unsaved change warns the player. The wording follows `design:ux-copy` and "Words about the app" in `teaching-voice`.
- **Signed-out visitors on public pages** (`/demo`, shared notes) with the database on. Their tools run over memory-only
  stores: they work for the visit and save nothing. `DemoPlan` swaps its `ProgressStore` for a memory one too. The store
  is chosen by whether someone is signed in, not by `DATABASE_URL` alone. (My call.)
- **The site without a database** (`DATABASE_URL` unset; accounts are off and nothing is gated). The stores fall back to
  today's local ones. They already exist, they keep local development without Docker working, and they stay as the
  test double. (My call.)
- **Deleting an account** removes all its rows, its shares and its blob files.

## Sharing

The owner keeps control of everything. Sharing makes a frozen copy at that moment; later edits never reach a link. To
share a newer version, the owner shares again and gets a new link. Share ids are long and random (unguessable), never a
sequence number.

There are two kinds of sharing, and they behave differently.

### Notes: a public link

- The notes creator's `SharePopover` becomes real. Sharing a note gives a link that anyone can open with no login. Its
  page is added to `src/lib/publicPaths.ts`.
- A visitor reads the note in `NoteReader` and can watch its videos. Its tools work for the visit and save nothing.
- The studio's "Share as a note" builds a note from the stage and creates the share directly, through the same
  popover. (My call.)
- The `#note=` links go away. Today a note travels inside the link's hash. Shared notes become database rows with their
  own address. Old hash links are dropped along with the browser data, since nothing has been released.
  `loginGuard`'s hash-keeping exists for those links and can go too, unless something else still needs it.

### AI autoplans: an invite, for teachers

- **Who can share.** Only teachers and owners. `FEATURES` in `src/features/account/model.ts` gets a new entry
  (`sharePlan: ["teacher", "owner"]`), and screens ask `can("sharePlan")`.
- **A teacher** clicks **Share plan** (`src/features/plan/PlanApp.tsx`, a placeholder today) and gets an invite link to
  the plan as it is now. The snapshot holds the plan's current week (`config`), without the teacher's ticks, ratings,
  intake answers or history.
- **Anyone else** (a student account) who clicks Share plan sees **Upgrade to Teacher account** in its place. There is
  no upgrade path in the app yet, so it explains what a teacher account does and links to the music-school offer
  (`/kickstarter`). (My call on where it links.)
- **Opening an invite.** The invite page is not public and shows nothing of the plan before login. A signed-out visitor
  sees "Create your account or log in to view", and logging in (link, code or Google) brings them back to it. A new
  person gets an account, as every first login does.
- **Claiming.** Once signed in, the person gets a copy of the plan in their own plans, added as a new plan next to any
  they have, not replacing one. From then on it is theirs: they practise it, and their ticks and ratings save as usual.
  Opening the same invite again doesn't add a second copy.
- **One link, many people.** An invite works for anyone who opens it until the teacher stops it. It isn't tied to one
  email. (My guess.)
- **No teacher–student link yet.** Claiming doesn't join the student to the teacher, and the teacher can't see who
  claimed or how they're doing. The copy records which invite it came from (one column), so a later studio feature can
  use it. (My call.)

### Both kinds

- **Stopping a link.** The owner can stop a share. A stopped note link says it's no longer shared. A stopped invite
  can't be claimed any more, but copies already claimed stay with the people who claimed them. The share popover lists
  the item's live links, each with its date and Stop. There is no separate page of shares. (My call.)

## Videos

- **Upload.** The browser uploads straight to Vercel Blob (client upload with a server-issued token), because a Vercel
  function can't take a large request body. The server checks that the person is signed in, the file type is video and
  the size is under the cap before issuing the token, and writes the `videos` row when the upload completes. Cap: 1 GB
  per video. (My call; change it if teachers record longer.)
- **A failed upload never loses the recording.** The recording is written to the browser first (IndexedDB, the
  existing `musickit-videos` store, now used as an upload queue) and stays there until the server has the file and its
  `videos` row. Then the local copy is removed. While it waits, the recording shows as not uploaded yet, and it can be
  played and retried. A failed upload says so and offers to try again. A recording still waiting when the page closes
  is picked up on the next visit in that browser and uploaded then. Leaving the page during an upload warns first.
  A recording that isn't uploaded also has a Download button, so the player can always save the file themself. That
  covers a browser that refuses storage (a private window may) or a queue that keeps failing. (My call, from the two options given: both. The
  queue in IndexedDB, since a video is far too big for localStorage, and Download as the way out.)
- **Private store.** Files are private blobs, as the NAM library already does (`src/app/api/nam/file/route.ts`,
  `@vercel/blob` with `access: "private"`). Nobody gets a permanent public blob URL.
- **Who may watch.** The owner, always. Anyone else only through a live (not stopped) note share whose snapshot embeds
  that video, or through a plan they claimed from an invite whose snapshot embeds it (a plan's `video` tool can hold a
  recording too). The server checks this on every request.
- **Formats.** Files are stored as recorded: WebM (VP9/Opus) from Chrome and Firefox, MP4 from Safari
  (`src/features/videos/recording.ts`). No transcoding in this round. A WebM may not play on an older iPhone; if that
  shows up in testing, transcoding is a later piece of work. (My call.)
- **Playing.** The video must seek, so the serving route has to answer HTTP range requests (or hand out a short-lived
  signed URL). The builder chooses, but seeking in a shared note must work.
- **Deleting a video** removes the file and the row. A shared note that held it shows that the video is gone. The owner's
  control wins over the frozen copy.
- The `videos` row holds what `SavedVideoInfo` has today (title, type, seconds, width, height, saved at) plus the owner,
  the blob path and the size.

## Tables (outline; the builder finalises)

- `user_documents (user_id, kind, data jsonb, updated_at)`, unique on `(user_id, kind)`. Kinds: `plan`, `note`,
  `course_notes`, `creator`, `records`, `about`. Each kind's JSON is parsed by the feature's existing parser on the way
  in and out (`parseBlock` for notes, and so on), never trusted raw.
- `progress_entries (user_id, exercise_id, …, updated_at)`, unique on `(user_id, exercise_id)`, matching
  `ProgressStore`'s `list / put / remove`.
- `videos (id, user_id, title, type, seconds, width, height, size, blob_path, created_at)`.
- `shares (id, user_id, kind ['note' | 'plan'], snapshot jsonb, created_at, stopped_at)`. A plan share is the invite.
- A claimed plan is a plan in the claimer's plan document, plus a `plan_claims (share_id, user_id, created_at)` row,
  unique on the pair, so a second open adds no second copy and the video check can find it.
- `share_videos (share_id, video_id)`, written when a note or plan is shared, so the watch check is one lookup.

All of them have `user_id` referencing `users` with `on delete cascade`. Blob files are removed by the account deletion
code, not by the cascade.

## Constraints

- Follow the account feature's rules (`src/features/account/CLAUDE.md`). Every changing route starts with `auth()` and
  `sameOrigin(req)` and finds the person with `requestAccount`. It never takes a user id from the request. Rules stay pure
  over a repo with Drizzle and memory versions, and tests run over the memory one.
- The UI talks only to the store interfaces. `PlanStore`, `ProgressStore` and `NoteStore` exist. Course notes, creator,
  records and "about me" get the same kind of interface before their API version is written.
- Production Postgres is Supabase behind a transaction pooler (`prepare: false` in `src/lib/db/client.ts`). Migrations
  go through `npm run db:generate` / `db:migrate`.
- This repo's Next.js has breaking changes. Read `node_modules/next/dist/docs/` before writing route handlers.
- Every screen word (save failure, share popover, stopped link, gone video) is written with `design:ux-copy` and "Words
  about the app".
- Each touched feature's `README.md` and `CLAUDE.md` are kept true in the same commit.

## Left to the builder

- API route layout and naming. A generic `/api/me/documents/<kind>` next to specific routes is fine.
- The share page addresses (for example `/notes/shared/<id>` and `/plan/invite/<id>`).
- Debounce timing, retry policy, and how the "unsaved" warning is wired.
- Range requests or signed URLs for video playback.
- The order of the work. Plans and progress first is a natural start, since their interfaces exist.
