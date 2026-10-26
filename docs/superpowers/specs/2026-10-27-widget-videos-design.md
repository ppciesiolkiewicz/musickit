# Widget videos: render branded practice videos from config files

## Intent

The site's owner posts practice videos to YouTube, Instagram and TikTok. They are aimed at people looking for practice material: a video is a resource someone saves and comes back to, not an ad. Making each one by hand in the teacher studio (record in real time, then export) doesn't scale to a steady stream of videos across three platforms.

So: **Claude writes config files, one command turns each into finished MP4s**, one per format (longer 16:9 for YouTube, shorter 9:16 for IG/TikTok), with the site's logo and address on screen. Nobody sits at the keyboard while it renders.

The videos are made from the **real widgets of the app**, not a re-drawn copy, so they always look like the site and every improvement to a widget shows up in the next batch. The config reuses the teacher studio's stage model (layers of widgets, positioned as fractions of the frame), so anything the stage can show, a video can show.

**First widget: Melodies (singing).** The viewer sings along: the tune plays on the piano, the bar runs across the staff on the beat, a run of tunes each played a few times. There is no microphone in these videos, so there is no voice dot.

## Goals

1. **Config file → MP4s, unattended.** A config describes one video. One command renders a folder (or a list) of configs, each to one MP4 per format it names. Rendering is offline and deterministic: every frame drawn from the timeline at its exact time, faster than or slower than real time doesn't matter, no dropped frames, the bar exactly on the beat, the same config renders the same video.
2. **Layers are the stage's layers.** The config's layers are the stage's existing JSON (`Subject` + `rect` as fractions of the frame, `src/features/stage/model`). Subjects are validated with `sanitiseSubject`; rects get a **video-only check** *(my call)*: the stage's own rect rules stay as they are (16:9 `FRAME_ASPECT` snapping, `logo`/`url` pinned top-right by `sanitiseStage`), because videos need 9:16 and movable brand marks and the studio must not change. The logo and site address are the existing `logo` and `url` subjects (`BrandWidget`).
3. **Formats.** At least `16x9` (1920×1080) and `9x16` (1080×1920), 30 fps *(my call)*. Each format gives its own rects for the layers (a 9:16 layout is not a squashed 16:9 one). One config can name several formats.
4. **A Melody widget on the stage.** New `Subject` kind `melody`, drawn by the real `MelodyStaff` in its "follow the bar" mode, no voice dot. The subject holds only the widget's options (`beats`); the tunes and their timing come from the video's timeline. Follow the stage's rules for a new kind (a case in `Subject`, `sanitiseSubject`, `subjectTitle`, `defaultRect`, the renderer, a test), but **don't add it to the teacher studio's palette yet** *(my call: the studio has no timeline to drive it, and what it should do there is its own question; leaving it out keeps the studio unchanged)*.
5. **Per-widget options**, starting with the Melody's **beats across** the staff (today's full screen is a fixed 10, `FOLLOW_BEATS`): fewer beats = bigger notes that scroll faster, more = more to read ahead.
6. **The timeline is a run of tunes, each played N times**, on one tempo:
   ```jsonc
   "timeline": [
     { "tune": 12, "times": 4 },
     { "tune": 13, "times": 4 }
   ]
   ```
   A tune is written out in the book's own notation (`parseTune`), so a config renders the same video years later and Claude can compose new ones. A book number (`BOOK[n]`) is accepted as a convenience, but Claude writes the notation into the configs it saves, with the number only as a label *(my call: book numbers shift when tunes are added or reordered)*. The video's length follows from the timeline. The short and long cuts are separate configs (or a shorter timeline) — not an automatic trim.
7. **Countdown with caption** (decided by the user). A new widget, a caption (text set in the config, e.g. "Tune 2 · get ready") with a countdown of the beats left. It runs before each tune, the first one included, in place of a bare count-in. *(My calls: the countdown takes one bar, counting 4-3-2-1 on the click. During it the next tune is already on the staff, standing still, so the viewer can read it before singing. Then the bar starts on beat 1. The tune change is a cut to the next tune at the start of its countdown bar, with no scroll-in strip. The caption text can be set per tune in the timeline. Repeats of the same tune follow straight on, with no countdown between them.)* Like the Melody widget, it is a stage subject driven by the timeline and is not in the studio palette yet.
8. **Sound.** The piano plays the tune every time through (decided by the user: keep it simple, piano always). The metronome click is heard *(my call)*. Audio is rendered offline from the same notes and the app's own piano samples, and joined to the picture.
9. **One voice per config** (decided by the user). The config names a voice from `VOICES` (`soprano` … `bass`). Tunes are placed in that range the way the Melodies page does it (`placeTune`, `clefFor`), which sets the octave the piano plays and treble or bass clef. Videos for another voice are separate configs. The field is required, and a missing or unknown voice fails the render *(my call: no silent default)*.
10. **Runs locally.** A script (node + Playwright from the npx cache + `/opt/homebrew/bin/ffmpeg`, both present on this machine) against the dev server. Output into a git-ignored folder *(my call)*; configs live in the repo *(my call: a top-level `videos/` folder)*.

### Example config (shape, not final syntax)

```jsonc
{
  "name": "c-major-stage-1",
  "formats": {
    "16x9": { "layers": { "melody": { "x": 0.05, "y": 0.2, "w": 0.9, "h": 0.6 }, "logo": { ... }, "url": { ... } } },
    "9x16": { "layers": { "melody": { ... }, "logo": { ... }, "url": { ... } } }
  },
  "key": "C", "scale": "major-ionian", "bpm": 80, "voice": "alto",
  "layers": {
    "melody": { "subject": { "kind": "melody", "beats": 6 } },
    "countdown": { "subject": { "kind": "countdown" } },
    "logo":   { "subject": { "kind": "logo" } },
    "url":    { "subject": { "kind": "url" } }
  },
  "timeline": [
    { "tune": "<notation>", "label": "book 12", "times": 4, "caption": "Tune 1 · get ready" },
    { "tune": "<notation>", "label": "book 13", "times": 4, "caption": "Tune 2 · get ready" }
  ]
}
```

## Non-goals (for now)

- **Stitching pre-recorded clips** (intros, a teacher on camera between tunes). Wanted later (decided by the user): the config's timeline should be able to grow other kinds of entry ("clip", "card") without a rewrite.
- Titles, intro/outro cards, captions, transitions, music beds.
- Any widget other than Melody (the design must not make others hard: a widget is driven by the timeline and the frame clock, nothing Melody-specific in the renderer).
- Muting the piano on some passes, the voice dot, a recorded singer.
- Uploading or posting; rendering in the cloud or on Vercel.
- A UI for editing configs. Claude writes them; at most a preview page to look at one.

## Anti-goals (failure even if it renders)

- Studio or page chrome in the frame: hover toolbars (`KeyTags`, `MediaLayer` controls), focus rings, scrollbars, cursors, the site nav.
- Picture and sound out of step: a note sounding before or after the bar reaches it, drifting over a long video.
- Frames that differ run to run, stutter, or a staff that jumps when a tune changes.
- Notes cut off at the edges of the frame, or text too small to read on a phone in 9:16.
- A config with a typo rendering silently wrong (an unknown tune, a missing rect). It fails loudly, naming the problem.
- The Melodies page or the teacher studio behaving differently afterwards.

## What exists (from a look at the code)

- **Stage** (`src/features/stage`): `Subject` union (no melody yet), layers with fractional rects, `StageFrame`, `StageWidget` (injectable: props in, callbacks out), `BrandWidget` for logo/url. Rules in `src/features/stage/CLAUDE.md`; behaviour spec `spec/studio.md`.
- **MelodyStaff** (`src/components/theory/singing/MelodyStaff.tsx`): all motion comes from one `requestAnimationFrame` loop reading `performance.now()`; the bar's place is `(now - anchor) / beatMs`. Its follow-camera eases 10% a frame (frame-rate dependent, so it must run at the render's fixed frame rate). Props include `beatMs`, `playFrom`, `gridBeats`, `live`, `follow`, `scale`; the voice comes from a `pitch` ref (null = no dot).
- **SingingApp** times playback off `getAudioContext().currentTime` and `setTimeout`. The video page must not reuse that timing: it drives the staff from the config's timeline instead.
- **Sound** (`src/features/sound`): `createPlayer` and the sample cache are tied to the app's single live `AudioContext` (`getAudioContext()`), and `playSequence` schedules with `setTimeout`. Offline audio needs the player and sample decoding to accept an `OfflineAudioContext` (or a small offline renderer built on the same samples and instrument config). Player ~120 lines, samples ~40.

## How (decided parts)

- **Real page, real widgets** (decided by the user: "we can reuse the same page"). A hidden route in the app renders one config at one format: the stage layers at the format's pixel size, driven by the timeline.
- **Frames by a stepped clock** *(my call)*. The render script opens that page in headless Chrome and takes over its clock (Playwright's clock API: `performance.now`, `requestAnimationFrame`, timers), advancing exactly one frame and capturing it, for every frame. Fallback if the clock takeover doesn't hold (e.g. CSS animations ignore it): give the page an explicit "time" input the widgets read.
- **Audio offline** *(my call)*. The full mix (piano + click) is rendered from the timeline's notes with the app's piano samples, to a WAV, then ffmpeg muxes frames + WAV into H.264/AAC MP4 at the format's size.

## Left to the builder

- Exact config schema and validation messages; where the timeline → notes/beat-times logic lives (pure, tested, in a model folder).
- The hidden route's path and how the script tells it which config and format (query, injected JSON); keep it out of the sitemap and nav, `noindex`.
- How to capture frames fast enough (screenshot per frame vs. CDP screencast with the stepped clock), image format, and piping into ffmpeg.
- Whether offline audio runs in the page (OfflineAudioContext, same sample files) or in node.
- The click sound (reuse the metronome's if it can render offline, else a short oscillator tick like `RhythmGame`'s).
- How the Melody widget hides its tap-to-play buttons and hover states in a video (no interaction there anyway).
- Default rects for 16:9 and 9:16 if a config leaves them out.
- Tests per the stage rules (`tsx --test`, the cached tsx), `npx tsc --noEmit`, lint, update `spec/studio.md` for the new Melody widget, and a short spec for the video tool.
