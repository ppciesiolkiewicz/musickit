# Neck effects

Reads a guitar neck from printed ArUco markers and the hands, works out where the frets are, and draws test effects over a
video: the live camera or a recorded take. Used by the riff Take panel (`devtools/riff/RiffTake.tsx`) and the content video
record page (`contentVideos/ui/RecordVideo.tsx`), behind each page's **Read the neck** tick. It doesn't run while a take records (the hand model would compete with the recorder);
it draws over the take as it plays back, and each page's **Export with overlay** (`contentVideos/client/burn.ts`) records the take
with the effects in the picture. `bare` hides the status line for that.

## How it reads the neck

- **Markers** (dictionary ARUCO_MIP_36h12, via js-aruco2) are printed from `public/riff` (`neck-markers-a4.pdf`,
  `neck-markers-a3.pdf`, `neck-markers-frets-a3.pdf`, the last printed by `scripts/neck-markers-frets.mjs`). Each one placed is
  typed into **Markers** as `id@fret`: fret N is the middle of fret space N, level with the dot inlays; fret 0 is the nut, with
  the marker's size after a slash when its edge is by the nut (`0@0/25`), and how far that edge is past the nut after a plus
  (`0@0/30+8`, in mm).
- **Hands**: MediaPipe Hand Landmarker, its runtime and model fetched from jsDelivr and Google storage on first use.
- **The grid** (`model/grid.ts`): a straight line through the placed markers seen, fitted to where a 25.5" scale puts their
  frets. No perspective and no strings yet: it gives the fret along the neck only. Two placed markers in view are enough.
  `placeByHand` picks the string of a pitch from the fret the fretting hand is at.

## Effects

Ticked in **Effects** (`model/fx.ts` names them, `ui/NeckView.tsx` draws them):

Under **Effects**, on by default. The mood effects: they show how the playing feels, not where it is. `model/mood.ts` works out a **mood** from the
notes heard (live) or passed (a take), and the fretting hand:

- **Energy** (0 to 1): how high up the neck the fretting hand is (fret 14 and above is the top; with no hand on the grid, how
  high the recent notes are), how many notes a second and how loud, over the last 2.5 s. It rises fast and falls slowly.
- **Key**: the key the last 8 s of notes sound most like (Krumhansl–Schmuckler, newer notes count more), once there are three
  different notes. **The colour** (`hueTarget`) is the home note's place on the circle of fifths round the colour wheel (C
  red, G orange, D yellow…), a minor key pulled toward blue and a major one toward amber. Before there is a key it is the
  last note's colour, and with no notes, blue when calm to red when wild. It eases round the wheel, never jumps.
- **Tension**: the last note against that key. The home note is settled, the 5th and 3rd nearly; the 7th more; a note outside
  the key, and the tritone most, is tense. Tension pulls the colour a little toward acid green.

The effects:

- **Mood light**: grades the video (dull and dark when calm, saturated when wild). Lights drift over it in the mood's colour
  and its neighbours (wider apart, faster and bigger as the energy climbs; a tense note brings one from across the wheel), and
  the last note's colour glows from the hand. The edges are dark when calm, else a ring of those colours turning round the
  picture and breathing. A pick washes the picture in its note's colour; landing on the home note gives a soft light. On the
  beat the picture brightens, the lights swell and the edges close in.
- **Neck heat**: flames off both edges of the fretboard from the nut to the fretting hand, the board itself left clear: a
  wide glow, then tongues hotter and paler toward the board, taller toward the hand and the higher up it is, with licks
  breaking off. Where the board is: the fret markers sit just inside its near edge, and it runs `neckWidthMm` (42 mm at the
  nut to 56 mm at fret 22) toward the fretting hand's side. Across the neck a mm is measured from how wide the markers look
  (`acrossPxPerMm`, their printed size from Markers or the A3 layout), since the board is seen at a slant. The flames start
  8 mm out from the board's edges, half see-through and with few licks, so they stay subtle. Between beats they burn low (a quarter, at Beat 100%); on each beat they leap, throw more
  licks and run a couple of frets past the hand. At Beat 0% they burn full all the time.
  The flames flow: slow waves roll along the neck toward the bridge, the tips sway and lean, the beat swells them and lets
  them settle (quick up, slow down), and the licks drift and curl.
- **Hand glow**: the same flames, only round the frets under the fingertips, in the last note's colour.
- **Sparks**: a burst from the note's fret space (or the hand) on each pick, more and faster with energy; calm sparks fall,
  wild ones float up, and embers rise off the picture above half energy.
- **Beat bump**: the picture (video and drawing) jumps a little on each pick, more when wild, and shakes on a tense note.

- **Hide markers**: paints over each marker seen in the colour around it (the median over a ring just outside it, so a
  string or a finger across doesn't tint it), graded like the video, and keeps it covered 0.4 s after it drops out.

Each mood effect has a **Strength** (0 to 200%, 100% the usual look); Mood light, Neck heat and Hand glow also have **Beat**,
how much they jump with it, and **Colour**: Mood (Hand glow: Notes), or Picked, a colour of your own drawn at the mood's
lightness. The beat (`stepBeat` in `model/mood.ts`) jumps on each pick and, live, with how loud the sound is against the
loudest it has been lately (`listenForPicks`' `onLevel`), then falls within a fraction of a second. On a take it comes from
the riff's notes only.

The status line adds the energy, the key and the tension.

The test effects (under **Test effects**, no settings):

- **Markers and hands**: the markers seen, with their ids, and the hands' points.
- **Fret lines**: wires 0 to 22 across the neck, with the dot frets numbered. The check that the grid lines up.
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
on the headstock, its edge about 8 mm past the nut (the truss-rod nut between them); 62 and 70 (24 mm) in fret spaces 1 and 3,
87 (20 mm) in 5, 97 (18 mm) in 7, 107 (16 mm) in 9; 51 (40 mm) on the body above the neck, level with fret 19; and two buttons under the picking hand, 52 Mono and 53 Neon.
**Where each marker goes** under the controls lists it, and **Use the A3 layout** puts it back in Markers and Buttons.

Settings are kept in this browser under `musickit.neckFx`, shared by both pages.

## Files

| File | What |
| --- | --- |
| `model/grid.ts` | Pure. Markers to a fret grid, the fret a point is at, the string a pitch was played on. `NeckRead`, a frame's read as logged with a riff take. |
| `model/mood.ts` | Pure. The mood: energy, key, tension, its colour and video filter; the beat. |
| `model/fx.ts` | Pure. Effects and filters, settings, buttons, where a wire or fret space is on screen, the eased grid, the fretting hand. |
| `client/listen.ts` | Browser. Picks and their notes from a stream's sound, and how loud it is. |
| `ui/NeckView.tsx` | React. The canvas over a video: reads markers and hands each new frame, draws every animation frame. |
| `ui/FxControls.tsx` | React. Markers, Buttons, Covering, Effects (the mood effects with Strength and Beat, and Hide markers) and Test effects; `useFx` keeps them. |
| `js-aruco2.d.ts` | Types for the untyped js-aruco2. |

Tests: `tsx --test src/features/neckFx/model/*.test.ts` (the cached tsx).
