# Videos

Videos a note or an exercise plays: the app's library of practice videos, and the videos a teacher records in the notes creator.

| File | What |
| --- | --- |
| `library.ts` | `VIDEO_LIBRARY`: the practice videos rendered from `videos/<id>.json` (`npm run video`), with title, line, area, length and the formats uploaded (`published`). Files are `VIDEO_BASE/<id>-<format>.mp4`; `VIDEO_BASE` is `NEXT_PUBLIC_VIDEO_BASE` or `/videos` (`public/videos/`, git-ignored). A video with nothing published is offered nowhere. Pure. |
| `ref.ts` | `VideoRef`: `{ source: "library", id }`, `{ source: "recording", id, title }` or `{ source: "placeholder", text? }`, and `sanitiseVideoRef`. Pure. |
| `Placeholder.tsx` | A placeholder: **Video coming soon** for a reader (with the placeholder's `text` under it, when it has one), **Record this video** (a button the host wires to its recorder) in the creator. |
| `recording.ts` | The recorder's pure parts: the recorded type, file names, a take's default name, the ten-minute limit. |
| `store.ts` | The teacher's own videos in IndexedDB (`musickit-videos`): save, list, get, rename, delete. In this browser only, nothing uploaded. |
| `VideoPlayer.tsx` | Plays a ref with the browser's controls; a recording not in this browser, or a file that won't load, says so; a placeholder reads Video coming soon. |
| `VideoRecorder.tsx` | Camera and microphone: **Start camera**, **Record** / **Stop** (a clock, ten minutes at most), then the take to watch, a **Name**, **Save and add to …**, **Record again**, **Download**. |
| `VideoChooser.tsx` | The Add a video dialog's body, its tabs in this order: **My videos** (watch, add, download, delete), **Record**, **Placeholder** and **attunr video library**. |

Used by: the stage's `video` widget (`StageWidget`, notes and the studio), the studio's Add a video dialog (`StudioApp`, from the palette's **Video** and **Record a video**), and the plan's `video` tool (`exercises/basics/video`, picked by the AI from the published library).

## Adding a library video
1. Write `videos/<id>.json` and render it horizontal: the library is 16:9 only (`npm run video -- videos/<id>.json --only 16x9`, see `spec/video.md`).
2. Upload `out/videos/<id>-<format>.mp4` to the video host (`NEXT_PUBLIC_VIDEO_BASE`); for local work copy it to `public/videos/`.
3. Add the entry to `VIDEO_LIBRARY` with `published: ["16x9"]` (a test holds the library to horizontal). Its `title` and `about` are teaching text (`teaching-voice`). The test checks the id, the length and the formats against the config.
