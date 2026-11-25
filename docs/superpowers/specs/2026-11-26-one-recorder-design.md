# One recorder: the riff maker and content videos

Status: design, for planning. Date: 2026-11-26.

## Why

There are two recorders that make the same kind of file. `src/features/devtools/riff/RiffTake.tsx` (the riff maker's Take panel, `/admin/content/riff`) and `src/features/contentVideos/ui/RecordVideo.tsx` (the record page, `/admin/content/videos/record`) both open a camera and an input, record a take, read the neck, export with overlay and save for players. Each one has things the other lacks:

- **Only the Take panel has:** a click with count-in and length, takes kept in the browser, Back to the previous take, Transcribe, and neck effects timed to the riff's notes (Pick pulse and Note flash on a take).
- **Only the record page has:** the widget's Place, Size and Free box, Tool controls, the face camera, a Sound per input, and the tool's overlay clock.

The owner is experimenting with how videos look. They want the widget sizing on the riff, and the OpenCV neck effects in time with what is played on the riff *and on other tools*. To get there, the two become one, but only where that makes sense. This is a working tool for the content team, not something players see.

## Goals

1. **One recorder.** `RecordVideo` is the only recorder. `RiffTake` goes away. Everything either one does today still works on the riff page and on the record page.
2. **Tools plug in.** A tool can export a kit to the recorder (below): the views it draws, its own controls, the notes it plays, and what to do after a take. A tool with no kit records as it does today.
3. **Neck effects in time with any tool.** On a take, the neck readers (`NeckCvView`, `NeckView`) get the notes the tool played, at their times in the video, with string and fret where the tool has them. Today only the riff passes notes; the record page passes none.
4. **Extra information over the video:** chords, fingers and notes on the neck, in a way that is easy to follow (see below).
5. **Riff gets the widget sizing:** Place, Size, Free and Tool controls from the record page.
6. **Riff videos get the moving overlay, the same as other tools** (owner's answer). Save for players stores the overlay clock with a riff take, so Watch video and the library draw the play-along over it like any play-along video.

## Non-goals

- No change to the Watch video or library strip components. Riff videos gain the moving overlay through the existing path (goal 6). Neck effects and the kit's extra views reach players only when they are burned in with Export with overlay.
- No change to how riffs are stored (`/api/dev/riffs`, seed files, `db:pull-riffs`) or how content videos are stored (`content_videos`, `blocks.videos`, the routes).
- No new neck effects beyond what goal 4 needs.
- No polish for riff-only parts while this is an experiment. Copy follows the repo's rules, but no new pages or flows.

## Anti-goals (a failure even if it works)

- The record page gets worse for tools that aren't the riff: more controls in the way, or a step that only makes sense for riffs.
- A take or a saved video is lost in the move. Takes already in IndexedDB under a riff id should still open.
- Recording gets choppy because effects or note timing run during the take. Today neck readers are off while recording, and that stays.

## The shape of it

### The recorder

`RecordVideo` keeps its job and its look. It gains the Take panel's general parts, so every tool has them:

- **Click** (at the tool's tempo, or a typed one when the tool has none), **Count-in**, **Length**, and the beat view while recording.
- **Takes kept in this browser** (IndexedDB, `riff/takes.ts` generalised), with Save file and Back to the previous take. *My call:* key a take by its target (`tool:<key>` plus steps, or `<block id>:<cell>`), and read old riff takes by their riff id, since today a riff's id is its block id.
- **Detection log** (`NeckRead`), as the Take panel keeps it.

### A tool's kit

My call on the shape, to be refined by the builder:

```ts
interface RecordKit {
  /** what the tool can draw over the camera and the take; the first is the default */
  views?: { id: string; label: string; draw(beat: number | null): ReactNode }[];
  /** the tool's own panel beside the recorder */
  controls?: ReactNode;
  /** tempo and length for the click; absent: the click asks for a tempo */
  tempo?: { bpm: number; bars: number };
  /** the notes it plays, one pass, in beats: for the neck effects */
  notes?: { beat: number; beats: number; midi: number; string?: number; fret?: number }[];
  /** how many beats one pass lasts, so notes repeat through a looping take */
  loopBeats?: number;
  /** actions offered on a finished take (riff: Transcribe) */
  afterTake?: (take: KeptTake) => ReactNode;
}
```

- The view picker lives with Place and Size. A tool with one view shows no picker.
- **Riff's kit:**
  - **Views:** the play-along's own drawing (what players get as the overlay), plus the Take panel's Sliding tab, Bar by bar and Chord box (`riff/NoteOverlay.tsx`).
  - **Controls:** the riff editor (notes, key, scale, tempo, position), the amp and sound, Save and Reload, and the saved-where line.
  - **Notes:** from `riffTimeline`. **Tempo:** the riff's bpm and bars. **After a take:** Transcribe and Play.
- **Play-along shapes and melody singer:** views from their existing `VideoOverlay`. Notes come from the part they play, with string and fret where the shape has them. The builder decides how far to take this for each tool. The play-along is the one to do first after the riff.

### Notes in time on a take

A take needs a map from the video's time to the tool's beat. There are two sources:

- **The tool played while recording:** the overlay clock already sampled (`model/clock.ts`, pieces of `[t, beat, rate]`).
- **Played to the click, tool not running:** the click's grid. This is one straight piece from beat 1 (`downbeat`, at `bpm / 60`), so it can be stored as the same clock type.

The neck readers get `kit.notes` repeated by `loopBeats` across the take, turned into seconds through that clock, with any missing string and fret left to the hand (as now). A take with neither source passes no notes. `TakeNote` in `neckFx/model/cvFx.ts` is the shape the readers already take.

### The riff page

*My call:* `/admin/content/riff` stays as the riff's home: the side list of riffs by genre, and the recorder with the riff's kit. The record page, opened on a riff block's cell, sends you there (`/admin/content/riff?riff=<id>`), so there is one place to edit and record a riff. Save for players still saves the take as the block's own video for its cell. The only change is that it now goes through `RecordVideo`'s save (with its `wouldLose` and after-save lines).

## Extra information over the video

The owner is experimenting with putting more on the video than the tab in the corner: **chords, fingers and notes**, drawn on the neck over the camera picture (the OpenCV reader, `NeckCvView`; Pick pulse today draws a ring from each note's place, its name while it sounds, and the chord name above the board). They want it to be easy to follow. This is a place to try things, so the build should make adding and switching layers cheap more than it should perfect any one layer.

- **Layers, each on or off** in the reader's settings, all driven by the kit's timed notes (string, fret, start and length), so they work for the riff and for any tool whose kit gives string and fret:
  - **Notes:** each note's place lit while it sounds (its written length, not a fixed 0.6 s), labelled by name or by its number in the key (1, b3, 5). The label choice is a setting.
  - **Chords:** when notes sound together (riff notes played `with` the one before, or a tool's chord), all their places light at once as one joined shape, with the chord name over them.
  - **Fingers:** which finger plays each note, as a number on its place. *Builder's call* where the finger comes from: from the riff's hand position (one finger per fret from `pos`), from the hand the reader sees (MediaPipe fingertips), or both. Start with the simpler one.
  - **Coming next:** the next note's or chord's places show faintly a beat before they are played. Takes only, since live there's no timeline to read ahead from.
- The layers draw on takes (and so in Export with overlay). Live over the camera they draw what can be known: notes heard, and fingers seen.
- *My proposal for the first layers to build:* Notes and Chords. Fingers and Coming next follow.

## Constraints

- Follow `AGENTS.md`. Commit with `scripts/commit.sh`, never `git add` in the main checkout. Keep the `README.md` and `CLAUDE.md` of `contentVideos`, `devtools` and `neckFx` true in the same commits. Interface copy uses `design:ux-copy` plus "Words about the app" in `teaching-voice`.
- `contentVideos` never imports plan UI. The kit is handed to `RecordVideo` by the page, as the tool is today.
- Export with overlay (`client/burn.ts`) must still capture the box with the chosen view and the neck effects in it.
- Keep the existing tests passing (`riff/*.test.ts`, `contentVideos` model tests, `neckFx` tests). New pure parts get tests: the click grid as a clock, notes into seconds through a clock with loops, and the take key.

## Calls made after review (mine, check them)

- **Which clock drives the views:** with the click on, the click's grid is the take's clock. Views, the beat view and the saved overlay clock all follow it, and you don't press Play on the tool. With the click off, the tool's own clock is used, as on the record page today. One clock per take, never both.
- **Kit views other than the default** (Sliding tab, Bar by bar, Chord box) are for watching back and for Export with overlay only. The saved overlay stays the tool's own drawing (`drawToolOverlay`), and the overlay type doesn't change.
- **Unsaved riff edits:** the saved overlay already carries a copy of the drawn tool's settings, and the drawn tool is the editor's current riff, so the overlay matches the take whether or not the riff was saved. The amber "video plays the older riff" line keeps working from that copy.
- **The click on other tools:** it goes inside the Sound group, off by default for a tool with no tempo, and on by default for a kit with a tempo (the riff). Count-in and Length show only while it is on.
- **Takes per target:** one kept take per target. The key is `tool:<key>` or `<block id>:<cell>`, without the ticked steps, so ticking levels never swaps the take. Back to the previous take stays in memory only.

## Left to the builder

- The exact kit type, and how a page builds it.
- Whether the general click uses `RiffTake`'s `startClick` as it is.
- Order of work. Suggested: move the general parts into `RecordVideo`; then put the riff page on it with the riff kit; then notes in time on takes; then the extra-information layers; then the play-along's kit.
- How the riff's unsaved edits reach the drawn tool. It should draw from the editor's current riff, not the saved one.
