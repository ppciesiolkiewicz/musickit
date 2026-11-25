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
- **Other things point at a video** by id, at three levels (user, 2026-11-25: "we need all 3"): a block (every level
  of it), one choice of it (one level), and one tool cell inside the exercise, for every choice or for one; later a
  course section does too (user). There is no links table (user).
- **The overlay** is the exercise's own tool drawn over the video while it plays (user). While recording, the tool sits
  over the camera and the recorder starts it when they like, with the tool's own Play (user). The take saves when
  the tool was started and stopped and with what settings; on playback the tool starts and stops at those times by
  itself (user: "exactly").
- **Permissions**: `role` is student or teacher and comes from the plan. A new `permissions` list holds any of `dev`,
  `content`, `admin` (user).
- **Pages**: `/admin/content` (the Content pages moved out of /dev, plus recording) for `content`; `/admin/admin`
  (what /admin is today) for `admin`; `/dev` for `dev` (user).

## Goals

- A person with `content` records a video for any exercise from the library and saves it; it is live for players at
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
| `made_for` text | the block id it was recorded from (or `riff:<block id>`), only for the path and for reading |
| `type`, `seconds`, `width`, `height`, `size` | as `videos` |
| `blob_path` text unique | |
| `overlay` jsonb, null | §4 |
| `created_at` | |

**Path** (call): `content/videos/<made_for>/<id>.<webm|mp4>`, e.g.
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

**Pointing at it**: a block, a choice of it, or a tool cell in it points at a content video by id (user). Stored in the
database only (call: seed files don't carry it, see §5), and **outside the block's `content`** (call): a new column
`blocks.videos jsonb`:

```
{
  block?: <video id>,                          // the whole exercise, every choice
  cells?: { "<cell index>": <video id> },      // one tool cell, every choice
  choices?: {
    "<choice id>": {                           // `<block id>/<name>`: one level
      block?: <video id>,
      cells?: { "<cell index>": <video id> }
    }
  }
}
```

**Which one shows** (call): the most specific wins. For the exercise as a whole, the drawn choice's `block`, else the
block's `block`. For a tool cell, the drawn choice's cell, else the block's cell. A choice-level video replaces the
block-level one only where it is set, so a block can have one video for every level and a harder take for the advanced
choice only. Keeping it out of `content` means a hashed block's id still matches its content, and the seed never has to
merge it. Saving a video from the library's Video panel sets it, in the same request.

Today every seed block has one choice (469 blocks, 2026-11-25), so block and choice level look the same until a block
gets a second choice; the panel still lets the recorder pick which.

- **Only curated (seed) blocks** get videos (call). The Video panel isn't offered on a Database only block. A player's
  edited copy of a curated block (a new hashed block with `parentId`) does not show the parent's video (call).
- **Plans look it up when drawn** (call): a player's plan is a stored copy (`user_documents`), so the plan page asks for
  the videos of the blocks on screen (one batch request by block id) each time it renders. A video recorded today shows
  in plans made before it, teacher weeks and shared plans included. The "only the first" rule runs there too, over the
  day on screen.

**/dev/riff**: the Take panel's **Save** uploads the take as a content video for the riff's block and points the riff
tool cell at it. The IndexedDB take stays as the local copy until the upload is done (call).

## 4. Recording panel and overlay

- Under each exercise opened in the library (`/admin/content/library/blocks?item=<id>`, in its row), a **Video**
  panel: the linked video if any (play, title, note, **Replace**, **Unlink**), or **Record**. It has two places: **Every
  level** (the block's) and **This level: <choice name>** (the drawn choice's), and says which one a player of this
  choice sees. Per tool cell, the same two, smaller.
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
  cell's entry, at both levels, and prints which (call). A choice the seed file no longer has loses its `choices` entry
  the same way; the videos themselves stay in `content_videos`.
- **Library tags**, always shown (user): every block and plan is listed, switched-off ones too; the
  `?include_not_enabled=1` link goes (user). Each row has **Seed** (from a seed file) or **Database only** (a player's or
  the AI's block, no file), and **Off** when it isn't offered to players. A block with a video has a video tag (call).
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
