# Content videos

Videos the app shows players with a tool: a video for a tool at the steps it covers, or a curated block's own video for one of its tool cells. They are made by people with the `content` permission (today the riff maker's Take panel saves a take as its block's video) and watched by anyone, signed in or not. A plan's day shows them (below); the library and the content pages come with tasks.txt ContentVideos5.

This is not `src/features/videos` (a player's or teacher's own takes, per account, in notes) and not `VIDEO_LIBRARY` or the `video` tool, which stay as they are. It shares only the pure upload rules (`videos/server/rules`), the recorder's pure parts (`videos/recording`, `videos/ref`) and the Range streaming (`videos/server/stream`).

## What a content video is

- A row of `content_videos` (migration `drizzle/0046_content_videos.sql`) and a file in the private Blob store at `content/videos/<made_for>/<id>.<webm|mp4>`. `made_for` is `tool:<tool key>` or a curated block's id (a riff take: the plain block id). The browser picks the id (`crypto.randomUUID()`).
- A **tool key** is the tool's type; a `guitar-play-along` is one tool per shape, `guitar-play-along:<shape>`.
- A **step** is `<ladder id>:<key>` (`picking-drill:beginner`, `chord-changes:1`), from `LADDERS` in `@/features/plan/model/ladders`. `none` is **No level**: a laddered tool's cell that reads no step. A tool with no ladder has no steps (`steps` null).
- **One video per tool and step.** A tool video is saved for the steps ticked; saving takes those steps off the tool's other videos in the same transaction (for a tool with no ladder, the tool itself). A video left with no steps keeps its row and file, with `tool` and `steps` both null. There is no any-step video and no borrowing from a nearby step.
- **A block's own video** lives in `blocks.videos` (`{ cells: { "<n>": "<video id>" } }`), by the cell's index among the block's tool cells in reading order (a section's cells in its place; `toolCells`). Only a curated block has one. Its row has `tool` and `steps` null.

## Which video a tool cell shows

`model/lookup.ts`: the block's own video for that cell (`from: "block"`), else the tool's video whose steps hold the cell's step (`from: "tool"`; a cell with no step matches a video with `steps` null), else none. A video met again at a later cell of the same block is `repeat: true`. A cell whose video's row is gone is left out.

## In a plan's day

Every day of a plan (`DayPanel` in `plan/ui/WeekView.tsx`: today's plan, a past day, a shared plan, a teacher's week, a demo) looks its videos up each time it is drawn (`plan/ui/useDayVideos.ts`), so a video saved today shows in plans made before it. One `lookup` request for the whole day: each exercise is a block (`key` `e<index>`; `blockId` only for a curated exercise, `isCuratedExercise`), its cells the tools **as drawn now** (`model/drawn.ts` `drawnAsks`: the version's chips at `at`, the choice chips at `picks`), so a chip that changes a tool's level changes the video. Each card holds its chips and reports its tools when they move (`ExerciseCard` `onAsks`); a card not on screen counts as first drawn. A video shows only at its **first place in the day** (`dayVideos`: exercises in order, cells in order), whatever the server's per-block `repeat` says. Answers are kept by request, so a chip moved back asks nothing, and the last answer stays while a new one is out.

A tool with a video gets **Watch video** right above it (`ui/CellVideo.tsx`, through `BlockBody`'s `beforeTool`): it opens the video in place, above the tool, which stays on screen and playable; **Hide video** closes it. Nothing loads until it is opened. A file that won't play says "The video could not be played. Check your connection, then press Watch video again." A failed lookup puts one line under the day's heading, "The exercise videos could not be loaded. The exercises work without them.", with **Try again**.

## The seed and `blocks.videos`

`db:seed-blocks` (`upsertCurated` in `userData/server`) never writes `blocks.videos` in its insert or update. The one write is a drop: when a block's tool cells moved (`model/keptCells.ts`: a changed count of tool cells drops every entry; another tool key at an index drops that entry), the moved entries are removed and printed (`video dropped  <block>  cell N  <video>  (the video is kept; point the cell at it again)`, and `N cell videos dropped` in the summary). The video's row and file stay. Text edits and a changed level keep the entry.

## Files

| File | What |
| --- | --- |
| `model/slot.ts` | Pure. `TOOL_LADDERS` (each laddered tool key's ladder ids, in the order tried; the steps come from `LADDERS`), `NO_LEVEL`, `toolKeyOf`, `isToolKey`, `stepsOfTool` (every step a tool's video can cover, then `none`; null with no ladder), `stepOf` (a cell's step), `toolCells`, `CellAsk` and `asksOf` (a block's tool cells as `{ cell, tool, step }`). |
| `model/lookup.ts` | Pure. `videoFor`, `firstShown`, `blockVideos`: which video each tool cell shows (above). |
| `model/drawn.ts` | Pure. `drawnAsks` (a block's tool cells as the reader draws them, chips and version applied) and `dayVideos` (a day's videos, each at its first place). |
| `model/keptCells.ts` | Pure. Which of a block's own video entries stay when its cells change (the seed's rule). |
| `server/rules.ts` | Pure. `BlockVideos` (the `blocks.videos` shape), `contentVideoPath`, `isMadeFor`, `Target` and `readTarget` (a save's target, checked against `madeFor`; a tool target is `{ kind: "tool", tool, steps }`, a cell target `{ kind: "cell", blockId, cell, tool }`, where `tool` is the tool key the Take panel read at that cell, and the repo answers no-cell when the stored block has another tool there; tool steps put in the tool's order), `cleanNote`. |
| `server/repo.ts` | `ContentVideoRepo`, `ContentVideoRow`, `Lost` (a video that lost steps to a new one), `Pointers` (what points at a video), and helpers both repos share. |
| `server/repo.memory.ts`, `server/repo.drizzle.ts` | The repo in memory (tests) and over Postgres. The Drizzle `create` runs in a transaction; a tool target takes `pg_advisory_xact_lock` on the tool, so two saves at once still leave each step on one video. |
| `server/repoContract.ts` | One contract for both repos: `repo.memory.test.ts` runs it in memory, `scripts/test-library-db.ts` (`npm run test:library-db`) on a local Postgres. |
| `server/access.ts` | Who may do what, over the repo, with Blob lookups passed in: `planContentUpload`, `completeContentUpload`, `listContentVideos`, `editContentVideo`, `deleteContentVideo`, `readLookup`, `lookUp`, `contentVideoInfo` (no store path, no author), `PlayInfo`, `CONTENT_VIDEO_CACHE`. Tested in `access.test.ts` over the memory repo. |
| `server/http.ts` | `contentVideos()`: the Drizzle repo, or null on a site without a database. |
| `ui/CellVideo.tsx` | React. Watch video / Hide video and the inline player above a tool on a plan card. |
| `client/api.ts` | The browser side: `saveContentVideo` (the file with `upload()` from `@vercel/blob/client`, then the row; never throws; `fileUp` when the file is up and only the row is missing; a 409 counts as saved when `GET /api/content-videos` lists the id), `lookUpVideos`, `contentVideoFileUrl`, `UPLOADED_NOT_SAVED`. Every fetch has a timeout except the file transfer itself (up to 1 GB). |

## Routes (`src/app/api/content-videos`)

| Route | Who | What |
| --- | --- | --- |
| `upload` POST | `content` and signed in | The client-upload token. `clientPayload` `{ id, type, size, madeFor }`; only `content/videos/<madeFor>/<id>.<ext>`, WebM or MP4 up to 1 GB, never over an existing file; a taken id is 409. 503 without a Blob token. |
| `/` GET | `content` | Every video, newest first: `{ videos }`. |
| `/` POST | `content` and signed in | After the upload: `{ id, title, note, type, seconds, width, height, path, madeFor, target }`. The file must be in the store and private (a public one is deleted and refused); its size is the store's. Saves the row: `{ video, lost }`. 409 for a taken id, a block not in the database, a cell past the block's tool cells, or a cell whose stored tool is not the target's `tool`. |
| `[id]` PATCH | `content` | `{ title, note }`. |
| `[id]` DELETE | `content` | Refused (409 with `pointers`) while a tool step or a block's cell points at the video; else the row, then the file (a file that can't be deleted is logged, the answer stays 200). |
| `[id]/file` GET | anyone | The file with Range, no session, no cookies, cached `public, max-age=3600` (a deleted video may play from a cache for up to an hour). A bad or unknown id, or a site with no database or store, is a 404. |
| `lookup` POST | anyone | `{ blocks: [{ key, blockId?, cells: [{ cell, tool, step }] }] }` (at most 60 blocks) answers `{ blocks: { [key]: [{ cell, id, from, repeat }] }, videos: { [id]: PlayInfo } }`, never cached. No database: empty. 400 for a bad body; 502 (logged) when the repo throws. |

Signed out with the `content` permission (development opens it to everyone), a save answers 401 "Log in to save a video.": `recorded_by` needs an account. A request that isn't a GET and doesn't come from this site is treated as signed out (`permissionCheck`), so in production it is a 404.

Still to check against the real store (no Blob token locally): an upload to `content/videos/tool:<key>/…` (the colon in the path), a ranged `get` answering 206, and the whole Save for players path on screen.
