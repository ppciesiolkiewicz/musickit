# Neck effects

Reads a guitar neck from printed ArUco markers and the hands, works out where the frets are, and draws test effects over a
video: the live camera or a recorded take. Used by the riff Take panel (`devtools/riff/RiffTake.tsx`) and the content video
record page (`contentVideos/ui/RecordVideo.tsx`), behind each page's **Read the neck** tick. For testing: nothing here is
saved into a take, and it doesn't run while a take records (the hand model would compete with the recorder).

## How it reads the neck

- **Markers** (dictionary ARUCO_MIP_36h12, via js-aruco2) are printed from `public/riff` (`neck-markers-a4.pdf`,
  `neck-markers-a3.pdf`, `neck-markers-frets-a3.pdf`, the last printed by `scripts/neck-markers-frets.mjs`). Each one placed is
  typed into **Markers** as `id@fret`: fret N is the middle of fret space N, level with the dot inlays; fret 0 is the nut, with
  the marker's size after a slash when its edge touches the nut (`0@0/25`).
- **Hands**: MediaPipe Hand Landmarker, its runtime and model fetched from jsDelivr and Google storage on first use.
- **The grid** (`model/grid.ts`): a straight line through the placed markers seen, fitted to where a 25.5" scale puts their
  frets. No perspective and no strings yet: it gives the fret along the neck only. Two placed markers in view are enough.
  `placeByHand` picks the string of a pitch from the fret the fretting hand is at.

## Effects

Ticked in **Effects** (`model/fx.ts` names them, `ui/NeckView.tsx` draws them):

- **Markers and hands**: the markers seen, with their ids, and the hands' points.
- **Fret lines**: wires 0 to 22 across the neck, with the dot frets numbered. The check that the grid lines up.
- **Hand glow**: the fret space the fretting hand's fingertips are in.
- **Note flash**: each pick lights its fret space with the note's name. Live, a pick is heard in the camera's sound
  (`client/listen.ts`: the rhythm game's onset detector, then the tuner's `detectPitch` on the 50 ms after it); on a take, the
  riff's notes at their times. The fret comes from `placeByHand`; with no hand on the grid, only the name shows.
- **Pick pulse**: a ring from the fretting hand on each pick, bigger when louder.
- **Fingertip trails**: fading tails behind the fingertips.

Colours follow the last note heard (one hue per note name). The grid is eased over frames (`easeGrid`) and kept half a
second after its markers drop out.

**Buttons**: covering a marker listed in **Buttons** (`56=mono, 57=neon`) turns on a filter over the video: Mono, Neon,
Warm, Cold, Invert, Blur. A marker counts as covered once it has been missing 0.2 s while another marker is still seen
(`coveredNow`). **Covering**: Hold keeps the filter on while covered; Toggle flips it on each new cover.

**The A3 layout** (`A3_LAYOUT`, the default Markers and Buttons), as stuck on the test Strat from the fret sheet: 56 (30 mm)
on the headstock touching the nut; 62 and 70 (24 mm) in fret spaces 1 and 3, 87 (20 mm) in 5, 97 (18 mm) in 7, 107 (16 mm)
in 9; 51 (40 mm) on the body above the neck, level with fret 17; and two buttons under the picking hand, 52 Mono and 53 Neon.
**Where each marker goes** under the controls lists it, and **Use the A3 layout** puts it back in Markers and Buttons.

Settings are kept in this browser under `musickit.neckFx`, shared by both pages.

## Files

| File | What |
| --- | --- |
| `model/grid.ts` | Pure. Markers to a fret grid, the fret a point is at, the string a pitch was played on. `NeckRead`, a frame's read as logged with a riff take. |
| `model/fx.ts` | Pure. Effects and filters, settings, buttons, where a wire or fret space is on screen, the eased grid, the fretting hand. |
| `client/listen.ts` | Browser. Picks and their notes from a stream's sound. |
| `ui/NeckView.tsx` | React. The canvas over a video: reads markers and hands each new frame, draws every animation frame. |
| `ui/FxControls.tsx` | React. Markers, Buttons, Covering and Effects; `useFx` keeps them. |
| `js-aruco2.d.ts` | Types for the untyped js-aruco2. |

Tests: `tsx --test src/features/neckFx/model/*.test.ts` (the cached tsx).
