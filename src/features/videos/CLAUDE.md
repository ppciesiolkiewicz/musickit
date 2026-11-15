# Videos: rules

What it is and where things live: `README.md`. Keep it true in the same commit as a change.

- `library.ts`, `ref.ts`, `recording.ts` and `queue.ts` stay pure (no React, no browser) and tested: `tsx --test src/features/videos/*.test.ts` (the cached tsx).
- Imports only shared `@/components`, the recorder's pure `clockTime` and, on the client, `@/features/userData/client` (`useDataSource`, `registry`, `load`); `server/` also imports the repo from `@/features/userData/server` and `blobToken` from `@/lib/blob`. The stage, the studio and the exercises import this feature; it imports none of them (its test reads the video configs through `@/features/teachers/video/model`).
- No camera or microphone prompt without a click (**Start camera**); the recorder lets go of the camera when it closes or a take stops.
- Without accounts (and for a visitor) a recording lives in this browser only. Every place that adds one says so; never promise that a shared note plays it elsewhere. Signed in, the recorder and **My videos** say a take is uploaded to the account, and until it is, that it stays in this browser.
- **A take is never lost because its upload failed.** It is queued in IndexedDB before the upload starts and dropped only after `POST /api/videos` succeeds. A take whose file is up (`fileUp`) never uploads the file again (the store won't overwrite). Every take not uploaded has **Download**; a failed one has **Try again**. If the browser refuses to store a take, the recorder says so before uploading it. The queue reports to the userData registry (`uploads.ts`) for the leave warning, never "failed" or "rejected": a failed upload shows in **My videos**, not in the save notice.
- A queued take belongs to the account that recorded it (`accountId`): only that account's runner uploads it and only its list shows it.
- **`server/` is server only and keeps the rules pure.** `rules.ts` and `stream.ts` take no Request, no SQL and no Blob SDK; `access.ts` takes the repo and gets Blob lookups passed in. A new query is a method on `UserDataRepo` in both `repo.drizzle.ts` and `repo.memory.ts`, and a new access rule gets a test in `server/access.test.ts`.
- **A person never reaches another person's video.** The user id comes from the session; a path the browser sends must be exactly `videoPath(me, id, type)`; the file route asks `watch` on every request and answers 404 (never 403) to anyone who may not watch, so an id is never confirmed. The file is answered with `cache-control: private, no-store`.
- Every IndexedDB call fails soft (null, `[]`, false), as private windows refuse storage.
- A library entry is offered (palette, prompt) only when `published` names a format that is uploaded. Don't list a format that isn't. The library is horizontal only: `published` holds `"16x9"` or nothing.
- Words: `title` and `about` are teaching text (`teaching-voice`); the dialog and recorder are interface copy (`design:ux-copy` with "Words about the app").
- Every change: tests, `npx tsc --noEmit` (ignore `.next/`), eslint on the feature.
