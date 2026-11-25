# Content videos: rules

What it is and where things live: `README.md`. Keep it true in the same commit as a change.

- **React lives in `ui/` only.** The plan imports `model/drawn`, `client/api` (`lookUpVideos`), `ui/CellVideo` and the `PlayInfo`, `CellAsk` and `CellVideo` types; nothing in this feature imports `plan/ui`.
- **A plan day looks its videos up by the tools as drawn** (`drawnAsks`, never the cells as written) and shows each video once per day (`dayVideos`).
- **`model/` stays pure and tested** (no React, no browser, no SQL): `tsx --test src/features/contentVideos/*/*.test.ts` (the cached tsx). `server/rules.ts` is pure too.
- **Steps come from `LADDERS` and are never restated.** `TOOL_LADDERS` names only each tool's ladder ids. A new ladder that reads a tool is added to `TOOL_LADDERS` under that tool (`slot.test.ts` fails until it is).
- **One video per tool and step**, kept by `create`'s transaction (and on Postgres its advisory lock on the tool). No other code writes `content_videos.tool`, `content_videos.steps` or `blocks.videos` (but for the seed's drop of a moved cell, next line); a change to who covers which step goes through the repo, in both `repo.memory.ts` and `repo.drizzle.ts`, with a case in `repoContract.ts`.
- **The seed never writes `blocks.videos`** except to drop an entry whose cell moved (`keptCells`), and it prints every one it drops. The video's row and file stay.
- **A delete is refused while something points at the video** (a tool step or a curated block's cell).
- **Imports:** `@/features/plan/model` (ladders, tools, choice, moves), `@/features/exercises/shapes` (`SHAPE_NAMES`), `@/features/videos` (`recording`, `ref`, `server/rules`, `server/stream`, `server/words`, and the `BlobLookup` and `Refused` types from `server/access`), `@/lib/db`, `@/lib/blob`. `@/features/devtools/server/access` and `@/features/account/server/http` in routes only. Nothing from `videos/library.ts`. `client/api.ts` takes only types from `server/`, plus the pure `contentVideoPath`.
- **Routes:** the file and lookup routes read no session and no cookies; every other route starts with `permissionCheck(req, "content")`, and the upload and the save also need a signed-in account (401 "Log in to save a video."). A video id is checked with `isVideoId` before it reaches the repo.
- **Every fetch has a timeout and every failure shows on the page**, except the file transfer itself, which shows **Uploading…** while it runs.
- Words: every `error` a route sends and the Take panel are interface copy (`design:ux-copy` with "Words about the app" in `teaching-voice`). A player reads "level", never "step".
- Every change: the feature's tests, `npm run test:library-db` on a local database when the repo changes, `npx tsc --noEmit` (ignore `.next/`), eslint on the feature.
