# Content videos, content permissions and /admin/content

Date: 2026-11-25. Task: tasks.txt, "TaskSeries ContentVideos".

Lines marked **(user)** were decided by the user. Lines marked **(call)** are the designer's and can be overruled.

## Why

- Exercises need a video of someone playing them: "it just shows you how to play it" (user). Today only /dev/riff can
  record one, and its take never leaves the browser (IndexedDB, **Save file** downloads it). Nothing reaches the Blob
  store or the database.
- The user wants other musicians to join and record videos so the work is split (user). They need a way in that does
  not open `/admin` (players' messages, users, invites) (user).
- Video files in the store should sit at paths a person can read and manage (user).

## What it is

- A **content video** is a row in a new database table, with its file in the private Blob store. It has a title and
  a note on what it shows. It is not tied to one key or tempo: it can be instructional, cover a couple of keys and say
  more than the exercise (user).
- **A video belongs to a tool, not to a block** (user, 2026-11-25: "it makes more sense for me to have the video
  assigned to the tool rather than block"). It is for a tool at one step of its ladder (picking-drill at beginner),
  or for a tool at any step (the tools with no ladder), and shows in every block that uses that tool there. One tool
  in one block can have its own video instead (a riff, a song), which wins. A block shows the videos of the tools
  inside it, each video once (user: "block based on the videos inside doesn't display duplicates"). Later a course
  section points at a video too (user). There is no links table (user).
- **The overlay** is the exercise's own tool drawn over the video while it plays (user). While recording, the tool sits
  over the camera and the recorder starts it when they like, with the tool's own Play (user). The take saves when
  the tool was started and stopped and with what settings; on playback the tool starts and stops at those times by
  itself (user: "exactly").
- **Permissions**: `role` is student or teacher and comes from the plan. A new `permissions` list holds any of `dev`,
  `content`, `admin` (user).
- **Pages**: `/admin/content` (the Content pages moved out of /dev, plus recording) for `content`; `/admin/admin`
  (what /admin is today) for `admin`; `/dev` for `dev` (user).

## Goals

- A person with `content` records a video for a tool at a level (or for one tool in one block) from the library and
  saves it; it is live for players at
  once, with no review step (user: "just save button will save it").
- The video plays with the exercise's tool running over it in step with the hands. The design works for any tool;
  this build does it for riffs and the melody singer (user).
- In a day's plan, an exercise with a video shows a video icon that opens it. If two exercises (or two tools) in the
  day point at the same video, only the first shows it (user: "make plan creator decide whether it's same video and only
  show the first one (preferred)").
- /dev/riff's Take panel saves to the same store and table, so a riff's video is its block's video (user: "fix video
  upload in /dev/riff to be able to upload them to blob").
- A person with `content` edits a riff in the riff maker and saves it to the database, in production too; it is live
  for players at once (user, 2026-11-25: "I want to be able to add video to riff and also edit riffs in the app. The
  rest has just video"). §5a.
- The library page always lists every block and plan, switched-off ones too, each tagged (user).
- Content people cannot open `/admin/admin` or the rest of `/dev` (user).
- Permissions are set per person from a users page (user).

## Non-goals

- Course sections with empty video spots to record into, and pointing a course section at a video: tasks.txt, later
  (user: "can be skipped ... noted in tasks.txt").
- Editing exercises (other than a riff's notes, §5a) or on/off in production. A block's or tool's `video` and a riff
  are edited in the app; everything else comes from the seed files (user: "We only allow to edit video in the app now
  the rest comes from re-generating"; riffs added 2026-11-25: "The rest has just video").
- A review or approval step for videos or riff edits (user).
- Writing an app edit back into a seed file, except riffs, which a development command pulls into their files (§5a).
- A timed drawing per tool written from scratch. Tools reuse their normal component unless they export a
  `VideoOverlay` (user).
- The ElevenLabs Sampler: stays in /dev (user).
- `VIDEO_LIBRARY` (`src/features/videos/library.ts`) and the `video` tool are left alone. That library is the rendered
  videos for YouTube and Instagram (user); content videos live beside it and share nothing with it.

## Anti-goals

- A content person reaching players' messages, accounts or invites.
- A seed run wiping a video someone recorded.
- An overlay out of step with the hands in the video, or one that changes the player's own settings for that tool.

## 1. Permissions

- `role` keeps only `student` and `teacher`, from the plan (`roleOnPlan`) (user).
- New column `users.permissions text[] not null default '{}'`, values `dev`, `content`, `admin` (user). None implies
  another (call); the user gives themself all three.
  - `dev`: /dev in production and the `/api/dev/*` routes that today call `devOrAdminGate` (today: role `admin`).
  - `content`: `/admin/content/*`, its API routes, and the Notes button (§6).
  - `admin`: `/admin/admin/*` and its routes, including setting permissions.
- In development everything stays open as today (no login for /dev). /admin/content in development also needs no login
  (call: same as /dev now). Recording and saving a video still need an account in development, since a video row has a
  `recorded_by` (call).
- **Migration moves the data** (user): accounts with role `admin` get `{dev, content, admin}`; their role becomes the
  plan's role. Both in one Drizzle migration (no separate script; the prelaunch DB may be reset, never without asking).
- `owner` (a school owner: teacher features, no /dev) is not one of the three permissions. **(call)**: `owner` stays a
  role as today; only `admin` stops being a role. Overrule if `owner` should go too.
- Teacher features (`sharePlan`, `students`) that `admin` has today: an account with the `admin` permission keeps them
  (call), so `can()` checks `role in [...] || permissions has admin`.
- `isAdmin` is replaced by `hasPermission(account, p)`. Every caller of `isAdmin`, `devOrAdminPage`, `devOrAdminGate`
  moves to the matching permission.
- **Users page** in `/admin/admin/users`: each person with three ticks (dev, content, admin). Only `admin` may change
  them; a person cannot remove their own `admin` (call, so the last admin cannot lock everyone out).

## 2. Pages

- `/admin` becomes a hub: links to `/admin/content` and `/admin/admin` for what the viewer may open.
- `/admin/admin`: today's `/admin` pages (messages, users, invites) moved one level down. Old URLs redirect (call).
- `/admin/content`: the **Content** group of `registry.ts` moved out of `/dev`, except the Sampler (user):

  | Page | In /admin/content |
  | --- | --- |
  | Library | with the Video panel (§4) and tags (§5) |
  | Learning path | as now |
  | Component stories | as now |
  | Onboarding coverage | as now |
  | Riff maker | reads and saves riffs in the database (§5a), in production too; recording saves to the store (§3). Until §5a lands, **Save to block** writes the seed file, works in development only and says so elsewhere |
  | Video studio | as now |
  | Copy notes | from the database (§6) |

- Parts that read this machine's disk or git (`nam/` amp models, the git commit for notes) say what is missing in
  production and keep working without it (call).
- The tab bar and index read the registry as today; each group gets the permission that opens it.
- The devtools import rule ("nothing outside this folder imports dev tools") extends to `src/app/admin/content`. Update
  `src/features/devtools/README.md` and `CLAUDE.md` in the same commit.

## 3. Content videos: storage

**Table `content_videos`** (user: a DB table; call: separate from `videos`, which holds players' private takes, owned and
deleted with the account and watched only by the owner and shares):

| Column | |
| --- | --- |
| `id` uuid | chosen by the browser, as for `videos` |
| `title` text | |
| `note` text | what it shows; may be empty |
| `recorded_by` uuid → users, `on delete set null` | the video stays when the person leaves (call) |
| `made_for` text | where it was recorded: `tool:<tool type>/<step key or any>`, or the block id for a block's own video (`riff:<block id>` from /dev/riff); only for the path and for reading |
| `tool` text, null | the tool type it is for (`picking-drill`); null for a block's own video |
| `step` text, null | the step of that tool's ladder it is for (`beginner`, a stage key), as the ladder's `read` gives it (`model/ladders.ts`); null: any step |
| `type`, `seconds`, `width`, `height`, `size` | as `videos` |
| `blob_path` text unique | |
| `overlay` jsonb, null | §4 |
| `created_at` | |

A unique index on `(tool, coalesce(step, ''))` where `tool` is set: one video per tool and step. Assigning a new one
clears `tool` and `step` on the old row, which stays in the table and the store (call). The assignment lives on the
video row, so there is still no links table (user).

**Path** (call): `content/videos/<made_for>/<id>.<webm|mp4>`, e.g.
`content/videos/tool:picking-drill/beginner/3f9c….webm` or
`content/videos/guitar-beginner-blues-boogie-pattern-in-a/3f9c….webm`. It names where it was made, not where it is used,
since a video can be pointed at from several places.

**Upload**: same shape as player videos (`src/features/videos`): `POST /api/content-videos/upload` gives the client
token (`content` permission, `content/videos/...` path only, WebM or MP4, size limit as `MAX_VIDEO_BYTES`, never
overwrite); `POST /api/content-videos` checks the file is in the private store and writes the row. A failed upload stays
in this browser and can be retried, with a visible error (every fetch has a timeout and every failure is shown).

**Watching**: `GET /api/content-videos/[id]/file` with Range, open to everyone, signed-out demo visitors
(`/demo/[slug]`) included, with no session check (call). Content videos are the app's own teaching material; the
route answers with a cacheable `cache-control` so repeat plays cost less. PATCH (title, note) and DELETE for `content`. Delete is refused while something points at it, listing what
(call).

**Which video a tool shows** (call), most specific first:

1. **The block's own** for that tool cell: `blocks.videos jsonb`, `{ cells?: { "<cell index>": <video id> } }`, stored
   in the database only (seed files don't carry it, see §5) and outside the block's `content`, so a hashed block's id
   still matches its content and the seed never has to merge it. For what only that block has: a riff, a song, a chord
   chart.
2. **The tool at its step**: the `content_videos` row with that `tool` and the `step` the ladder reads from the cell's
   settings (`read` in `model/ladders.ts`; a tool with several ladders uses the first that reads a step).
3. **The tool at any step**: the row with that `tool` and no `step`. The tools with no ladder (`backing-band`,
   `chord-shapes`, `scale-neck`, ...) only ever have this one or a block's own.

Videos are not tied to a key, chord or tempo (§ What it is), so one video serves every block that uses the tool at
that step. **Order of recording** (user): first one video per tool at any step, then one per step as the
steps come, each showing what is new at that step (its new cues: picking-drill's beginner video shows the upstroke, its
advanced one the string skip). Rule 2 takes over from rule 3 for that step as soon as its video is saved; nothing in a
block changes. 14 of the 38 tools have the four-step level (new, beginner, intermediate, advanced, `exercises/basics/levels.ts`),
a few have stages (the melody and run books, song-chart), the rest none (2026-11-25).

**No duplicates** (user): a block shows each video once, at the first tool cell that resolves to it; the later cells
with the same video show none. The day's plan applies the same rule over the whole day (Goals: "only the first shows
it"). Saving a video from the library's Video panel sets the row's `tool` and `step`, or the block's cell, in the same
request.

- **A block's own video** is only for curated (seed) blocks (call); the panel offers only the tool's video on a
  Database only block. A player's edited copy of a curated block (a new hashed block with `parentId`) does not show the
  parent's own videos (call), but tool videos show in every block, a player's and the AI's included, since they belong
  to the tool.
- **Plans look it up when drawn** (call): a player's plan is a stored copy (`user_documents`), so the plan page asks for
  the videos of what is on screen each time it renders: one batch request with the block ids and each tool cell's tool
  and step. A video recorded today shows
  in plans made before it, teacher weeks and shared plans included. The "only the first" rule runs there too, over the
  day on screen.

**/dev/riff**: the Take panel's **Save** uploads the take as a content video for the riff's block and points the riff
tool cell at it (a block's own video: a riff is that block's alone). The IndexedDB take stays as the local copy until the upload is done (call).

## 4. Recording panel and overlay

- Under each tool cell of an exercise opened in the library (`/admin/content/library/blocks?item=<id>`, in its row), a
  **Video** strip: the video that cell shows now and where it comes from (**For picking drill, beginner**, **For picking
  drill, any level**, or **For this block only**), with play, title, note, **Replace**, **Unlink**, or **Record**.
  Recording asks which it is for: the tool at this step (the default), the tool at any step, or this block only. A cell
  whose video already showed higher up says so instead of repeating it.
- A **Tools** view in the library lists every tool and its steps with the video each has, so the gaps can be recorded
  without hunting for a block that uses them (call).
- Recording, reusing `VideoRecorder` parts and /dev/riff's camera and audio input picking: the camera fills the
  frame and the exercise's tool sits over it. The recorder starts and stops the tool with its own controls whenever they
  want (user). A strict click/count-in is not needed (user: "more permissive"); /dev/riff keeps its click mode for
  transcribing.
- **What the overlay saves** (`content_videos.overlay`): the tool's type and settings when recording started, and a
  list of events `{ t: seconds into the video, kind: "start" | "stop" | "set", settings? }`. Settings are a copy, not a
  link: a later change to the exercise doesn't move the overlay off the hands (call).
- **Playback**: the tool is drawn over the video with the saved settings and starts, stops and changes on the saved
  times. Seeking moves the tool to match. The player can hide it. The player's own settings for that tool are set aside
  while the video plays and come back after (call: anti-goal above).
- **Per tool**: a tool may export `VideoOverlay` (user), a compact view for over a video (riffs: the sliding tab or
  chord box from `NoteOverlay.tsx`). A tool without one uses its normal component (user: "re-export normal one for
  now"). The tool registry gets the optional export. How a tool is driven from outside (start, stop, seek, settings) is
  the builder's to design. **This build drives two tools** (user): the riff (`guitar-play-along` with a riff shape)
  and the melody singer (`melody-singer`). Every other tool records with no overlay and says so.
- Overlay data is optional: a video with none just plays.

## 5. Exercises in the library and the seed

- **What the seed owns** (user): everything in the seed file, on/off (`draft`) included, except a riff edited in the
  app (§5a). `db:seed-blocks` updates it every run, as today.
- **What the app owns**: `blocks.videos`, and the riff of a riff block once it is edited in the app (§5a). The seed
  never writes or clears `blocks.videos` (user: "if the field is empty on seed,
  e.g. video, then this should not be updated"). Since a tool cell has no id, a cell's video is kept by its position in
  `cells` (call); if a seed edit changes the cells' count or the tool type at that position, the seed run drops that
  cell's entry and prints which (call); the video itself stays in `content_videos`. Tool videos need nothing from the
  seed: a block whose tool moves to another step just shows that step's video.
- **Library tags**, always shown (user): every block and plan is listed, switched-off ones too; the
  `?include_not_enabled=1` link goes (user). Each row has **Seed** (from a seed file) or **Database only** (a player's or
  the AI's block, no file), and **Off** when it isn't offered to players. A block whose own video is set has a video tag (call); the Tools view shows which tool steps have one.
  A riff edited in the app and not yet pulled into its file has an **Edited in the app** tag (call).

## 5a. Riffs edited in the app

Added 2026-11-25 (user: "I want to be able to add video to riff and also edit riffs in the app. The rest has just
video").

- **What is edited**: what the riff maker's **Save to block** writes today (`withRiff` in
  `src/features/devtools/riff/blocks.ts`): the key, scale, notes, tempo (a tempo range in `moves` moves with it) and
  amp. The block's words, genre, choices and on/off stay the seed file's (user: "the rest has just video").
- **Who**: `content` permission, in production and development. Only curated riff blocks; the riff maker makes no new
  block, as today (a new riff is still a seed block written with `exercise-example`).
- **Saving** (call): the riff maker reads riffs from the database and its **Save** writes the riff into the block's
  `content` in the database through a `content`-gated route, with `blocks.riff_edited_at` and `riff_edited_by`
  (→ users, `on delete set null`) set. Live for players at once, no review. **Reload** reads the database again.
- **The seed keeps an edited riff** (call): for a block with `riff_edited_at` set, `db:seed-blocks` takes everything
  from the file but keeps the database's riff (`withRiff` over the file's block) and prints which riffs it kept. A
  block without it is seeded as today.
- **Back into the files** (call): `npm run db:pull-riffs`, run in development against a chosen database, writes each
  edited riff into its seed file with `withRiff`, so agents, the library MCP and `exercise-example` read the current
  notes. It leaves `riff_edited_at` set (the database and the file then agree, so the seed keeps the same riff either
  way). After a pull the **Edited in the app** tag goes, since the file matches.
- **Plans** (call): a player's plan is a stored copy, so a riff edit reaches plans made after it; plans already made
  keep the riff they were made with. (Videos differ: they are looked up when drawn, §3.)
- A content video's overlay keeps its own copy of the settings (§4), so a riff edit after recording doesn't move the
  overlay off the hands; the riff maker shows a note when a riff with a video has changed since it was recorded (call).

## 6. Notes for content people

- Content people get the whole Notes feature (user): the floating **Notes** button, note mode, the page modal, and
  `/admin/content/notes`.
- Notes move from `localStorage` to a database table (`notes`: id, author, route, the text, context, the commit it was
  made at, created/updated) so the user sees everyone's notes (call). Every content person sees every note, with its
  author (call). A note's commit is the deployed build's commit (`VERCEL_GIT_COMMIT_SHA`) in production, `HEAD` in
  development (call).
- `/api/dev/source` (file and line from React's dev stack) works only in development; in production a note keeps the
  regions, headings and text but no source lines (call).
- Existing `localStorage` notes are moved into the table once on first load for a signed-in person with `content`
  (call).

## Build order (call)

1. Permissions and migration; users page.
2. `/admin` split: `/admin/admin`, `/admin/content` with the moved pages; library tags.
2b. Riffs edited in the app (§5a): save to the database, the seed keeps them, `db:pull-riffs` (tasks.txt
   ContentVideos11).
3. Content videos: table, Blob path, upload and file routes, `video` field kept by the seed, /dev/riff saving there.
4. Video in the plan: video icon, the first-only rule for a day.
5. Recording panel with the tool overlay; `VideoOverlay` for the riff tool.
6. Notes in the database.

Each step lands on its own and leaves the app working.

## Left to the builder

- Component and file layout, API route shapes beyond what is named, names of the overlay event types.
- How tools are driven from outside for the overlay (§4).
- Where the video icon sits on a plan exercise and how the video opens (modal or inline), following existing plan UI.
- Copy: all interface text with `design:ux-copy` and "Words about the app" in `teaching-voice`.

## Later (tasks.txt)

- Course sections with empty video spots a content person records into, and a `video` field on course sections.
- Reusing a video in several places from the content view (pick an existing video for an exercise or section).
- Pulling an app edit back into a seed file, if editing beyond `video` and riffs is ever allowed in the app (riffs have
  `db:pull-riffs`, §5a).
- The overlay for the other tools (each made drivable from outside, with a `VideoOverlay` where useful).
