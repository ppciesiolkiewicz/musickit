# Widget videos

Branded practice videos rendered from config files with the app's real stage widgets: one config, one MP4 per format it names. Design: `docs/superpowers/specs/2026-10-27-widget-videos-design.md`. Code: `src/features/teachers/video` (config, score, the render page) and `scripts/video` (the command).

## Now
- **Melodies (singing)** is the first widget: the tune on a staff the bar runs across on the beat, the piano playing it every pass, the metronome clicking every beat (accented on beat 1). Before every tune, the first included, a one-bar countdown (4-3-2-1 on the click, under the tune's caption) with the tune already standing on the staff; then its passes follow straight on. A new tune is a cut at the start of its countdown. No microphone, no voice dot.
- **The view** rides the bar at a steady pace, the bar at least the faded copy of the last half bar in (a third across from 6 beats up, half at 4; under 4 beats it stays at half and the copy is cut), so from the wrap to beat 1, in the countdown and in the closing second that copy and its labels are whole on screen. At the end of a pass the view jumps back to the start in one frame, never sweeping back. (The Melodies page's own follow view still eases after the voice dot.)
- **Formats:** `16x9` (1920×1080, YouTube) and `9x16` (1080×1920, Instagram and TikTok), 30 fps, H.264 (`yuv420p`) with AAC sound. Each format has its own layout.
- **Configs** live in `videos/*.json` (in the repo). **Output** goes to `out/videos/<name>-<format>.mp4` (git-ignored).

## The command
Start the dev server first (`npm run dev`, on port 3000; in a worktree use `npx next dev --webpack`, since Turbopack fails on the symlinked `node_modules`, and pass `--base` if it lands on another port), then:

```
npm run video -- <config.json or folder>… [--base http://localhost:3000] [--out out/videos] [--only 9x16]
```

- A folder means every `.json` directly in it (`npm run video -- videos`).
- `--only` takes a format id or a comma list (`--only 16x9,9x16`); other formats the configs name are skipped.
- Each file written is printed on its own line, with its frame count, length and how long it took. Progress (every 5 %) shows on one line while a file renders, when the output is a terminal.
- `--frames 0,45,last` (debug) saves just those frames as PNGs in `<out>/frames/<name>-<format>-<n>.png` instead of encoding, with no sound. Used to check that two runs draw the same pixels (`shasum`).
- Needs Playwright in the npx cache (`~/.npm/_npx/*/node_modules/playwright`, or `PLAYWRIGHT_PATH=<its index.mjs>`) with its Chromium, and `/opt/homebrew/bin/ffmpeg`.
- Speed: about 1.5 to 2 times the video's length per format on this machine (the 82 s example: 154 s at 16:9, 129 s at 9:16; the 7-minute one: 13 and 11 minutes), nearly all of it screenshots.
- The page's live-reload socket is cut off for the render, so editing files while a render runs doesn't reload it; if the page reloads anyway the render stops with an error rather than writing a broken MP4.

## How it renders
- Headless Chromium opens the hidden page `/teachers/video/render` at the format's exact pixel size (`deviceScaleFactor` 1), with the config and format in `window.__VIDEO_JOB__`. The page checks the config, places the tunes for the voice, loads the piano samples and the fonts, then reports `window.__video` (`ready` with the frame count, or `error` with the message).
- **Stepped clock** (`scripts/video/clock.js`, run before the page's own scripts): `performance.now()` stands still and `requestAnimationFrame` only fires when the script steps the clock, one frame (1000/30 ms) at a time. The page and the staff take all their motion from these, so every frame is drawn at its exact time however long a screenshot takes, and the same config gives the same pixels on every run. Each step also waits for one real browser frame (and React's commit of it), so what only a real frame delivers, such as a new tune's staff measuring its width, is drawn the same whether the frame is captured or skipped: `--frames` PNGs match the encoded video's frames.
- Each frame is a PNG screenshot piped into ffmpeg; the soundtrack (piano and clicks, rendered offline in the page from the same score, 48 kHz 16-bit stereo) goes to `out/videos/.tmp/<name>-<format>.wav`, is muxed in and deleted. The sound runs a second past the last beat so the final note rings out.
- The page hides the dev server's indicator; nothing else of the app (nav, hover toolbars, cursors) is in the frame.

## Writing a config
```jsonc
{
  "name": "c-major-first-steps",        // the output file name: lower-case letters, digits and dashes
  "key": "C",                           // the Do: a note name ("C", "F#", "Bb")
  "scale": "major-ionian",              // a singing scale slug, as on the Melodies page
  "bpm": 80,                            // whole number, 40 to 200
  "voice": "alto",                      // required: soprano, mezzo, alto, tenor, baritone or bass
  "layers": {                           // the stage's widgets, keyed by an id of your choice, painted in this order
    "melody": { "subject": { "kind": "melody", "beats": 4 } },
    "countdown": { "subject": { "kind": "countdown" } },
    "logo": { "subject": { "kind": "logo" } },
    "url": { "subject": { "kind": "url" } }
  },
  "formats": {                          // one or both of 16x9 and 9x16, a rect for every layer
    "16x9": { "layers": { "melody": { "x": 0.08, "y": 0.3, "w": 0.84, "h": 0.5 }, "...": {} } },
    "9x16": { "layers": { "melody": { "x": 0.02, "y": 0.39, "w": 0.96, "h": 0.22 }, "...": {} } }
  },
  "timeline": [                         // the tunes in order
    { "tune": "1 2 1 2 | 1w", "label": "book 1", "times": 4, "caption": "Tune 1 · get ready" }
  ]
}
```

- **layers:** each `subject` is a stage subject (`src/features/stage/model/subject.ts`), checked the way the studio checks its own. Exactly one `melody` layer. `melody.beats` is how many beats fit across the staff (a whole number from 2 to 16, default 10; anything else is an error): fewer means bigger notes that scroll faster. `countdown` shows the caption and the beats left. `logo` and `url` are the attunr logo and site address; unlike in the studio they go wherever their rect puts them. Any other stage widget can be a layer too.
- **formats:** rects are fractions of the frame (0 to 1): `x`, `y` the top-left corner, `w`, `h` the size, inside the frame. The 9:16 layout is its own, not a squashed 16:9 one; keep text big enough to read on a phone.
- **timeline:** `tune` is the book's notation, bar by bar (`|`), one token a note: the degree 1 to 7 (1 = Do), `'` an octave up, `,` an octave down, then the length (none = quarter, `e` eighth, `q.` dotted quarter, `h` half, `h.` dotted half, `w` whole). It must fill whole bars of 4. Write the notation out (copied from `STAGES` in `src/features/theory/singingMelodies.ts` for a book tune) with the book number only as the `label`: book numbers shift when tunes are added or reordered. A bare book number (`"tune": 12`) is accepted as a shortcut. `times` is how often it is sung (1 to 16), `caption` the text over its countdown (default "Get ready"). The tunes are placed in the voice's range the way the Melodies page places them, which sets the piano's octave and the clef.
- The video's length follows from the timeline: per tune one countdown bar plus `times` passes, plus a second at the end. At 80 bpm a bar is 3 s.
- Short and long cuts are separate configs.

Examples: `videos/c-major-first-steps.json` (book 1–3, 4 times each, 82 s) and `videos/c-major-do-re-mi-long.json` (book 1–12, 4 times each, 7 min).

## What fails, and why
Every failure prints `<config path>: <message>`, renders nothing for that config, and makes the command exit 1; the other configs still render.
- **A bad field:** the message starts with its path, e.g. `voice: required, one of soprano, mezzo, alto, tenor, baritone, bass`, `timeline[1].tune: bad note "8" in "8 1 | 1w"`, `timeline[0].tune: 6 beats is not whole bars of 4`, `formats.9x16.logo: missing rect`, `formats.16x9.melody: rect runs outside the frame …`, `layers.chart.subject: not a known widget`, `formats.4x3: no such format (16x9 or 9x16)`, `layers.melody.subject.beats: expected a whole number from 2 to 16`. A typo never renders a silently wrong video.
- **Not JSON / no such file:** `not valid JSON: …`, `no such file`.
- **The window and the format disagree** (the script's size table and the page's drifted apart): `the window is …, but 9x16 is 1080x1920`.
- **The page never answers in 60 s** (dev server down or still compiling): a Playwright timeout; rerun once the server is up. A failed ffmpeg prints its last lines; ffmpeg exiting early (or missing) stops the render at once with that error, never hangs, and leaves no MP4.
- Wrong options (`--only 4x3`, no configs) print the usage and exit 2.
