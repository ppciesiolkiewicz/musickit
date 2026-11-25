# Neck effects

Reads a guitar neck from printed ArUco markers and the hands, works out where the frets are, and draws test effects over a
video: the live camera or a recorded take. Used by the content video recorder (`contentVideos/ui/RecordVideo.tsx`), on the record page and the riff maker, behind its
**Read the neck** tick. It doesn't run while a take records (the hand model would compete with the recorder);
it draws over the take as it plays back, and each page's **Export with overlay** (`contentVideos/client/burn.ts`) records the take
with the effects in the picture. `bare` hides the status line for that.

## How it reads the neck

- **Markers** (dictionary ARUCO_MIP_36h12, via js-aruco2) are printed from `public/riff` (`neck-markers-a4.pdf`,
  `neck-markers-a3.pdf`, `neck-markers-frets-a3.pdf`, the last printed by `scripts/neck-markers-frets.mjs`). Colour dots to stick along both board edges (`neck-dots-a4.pdf`, `neck-dots-a3.pdf`, `scripts/neck-dots.mjs`) are printed for trying out; no reader reads them yet. Each one placed is
  typed into **Markers** as `id@fret`: fret N is the middle of fret space N, level with the dot inlays; fret 0 is the nut, with
  the marker's size after a slash when its edge is by the nut (`0@0/25`), and how far that edge is past the nut after a plus
  (`0@0/30+8`, in mm).
- **Hands**: MediaPipe Hand Landmarker, its runtime and model fetched from jsDelivr and Google storage on first use.
- **The grid** (`model/grid.ts`): a straight line through the placed markers seen, fitted to where a 25.5" scale puts their
  frets. No perspective and no strings yet: it gives the fret along the neck only. Two placed markers in view are enough.
  `placeByHand` picks the string of a pitch from the fret the fretting hand is at.

## The OpenCV reader

A second reader, behind each page's **Read the neck (OpenCV)** tick (one reader at a time: ticking one unticks the other). It
draws each fret wire across the board and the markers it found (orange: followed from the last frame, not found in this one),
and what its own controls (`ui/CvControls.tsx`, kept under `musickit.neckCv`; `model/cvFx.ts`) tick:

- **Fret numbers**: Dot frets (3, 5, 7, 9, 12, 15, 17, 19, 21), All frets or Off; each number (24 px at 1280 wide) above and
  below the board, in the middle of its fret space.
- **Strings**: the six strings found (`stringsOf`, below).
- **Notes under fingers**: MediaPipe's hand model (`client/hands.ts`, shared with the other reader); each fingertip over the
  board (the hand with most of them is the fretting hand) gets its fret space and nearest string (`placeOnNeck`) and the note
  that place sounds. A note heard (live: the camera's sound through `listenForPicks`; a riff take: its notes at their times) is
  placed by `guessPlace`: a finger on a place that sounds it, else the place nearest the fingers, else the open string; it
  rings out there and the status line says where ("Heard: A · D string, fret 7"). Low E is taken to be the string higher on
  the screen (a right-handed player filmed from the front).
- **Neck fire** (with Strength): flames off both of the board's edges, each tongue its own height, flicker and lean (toward the
  body, as if the neck moved through the air) and bending as it rises (drawn in slices, each swaying after the one below), over
  a soft glow; waves of heat roll along the neck from the nut toward the body, and wisps of flame drift along the edges toward
  the body, rising off the board as they go; hottest round the fretting hand and with the playing's energy
  (`heatAt`), leaping on each note heard with the note's colour running through them, licks breaking off where it is hottest.
  A note heard also shakes its string from where it was played to the end of the board, glowing in its colour, and throws
  embers along it.
- **Pick pulse**: on each note played, two rings grow out from its place on the board (bigger when louder) in the note's
  colour; while it sounds, a dot on that place carries its name; and when two or more notes sound together, the chord they make
  (`chordOf`, chordKit's `gripName`: "Am", "E5", "C/E") stands above the board over them, held while they sound and fading
  after. On a take the notes come from the riff, on its own strings and frets, and are drawn on the video's clock
  (`pulsesAt`), so a ring lands on the frame its note starts on, through a seek or an export. Live, a note is placed by
  `guessPlace` and counts as sounding for 0.6 s, so picks heard that close together make the chord; the sound gives one
  pitch per pick, so a strum reads as its loudest note.

How it reads: `ui/NeckCvView.tsx` draws; `client/cv.ts` loads OpenCV.js (the
`@techstark/opencv-js` build, from jsDelivr on first use, about 10 MB) and does the image work; `model/cvFrets.ts` is the maths.

- **Markers**: OpenCV's ArUco detector on the frame at full size after a 5 px median blur, which wipes the strings off the
  markers (on the test video it more than doubled how often the fret 1 and 7 markers are found). Too small or not square is
  dropped. A marker missed is followed from the last frame by optical flow for up to 8 frames, if its corners track back.
- **Which markers**: the fret markers in **Markers** (not the nut), sizes from Markers or the A3 layout, without `OFF_BOARD`
  (51, on the body). A marker off the line the others make is left out too.
- **The frets**: the marker centres give the neck's axis and where each fret falls along it, with perspective (`projFit`, two
  markers are enough). The frame is turned so the axis is level (the strip); each fret is snapped to the bright wire nearest it
  and the fit redone on the wires found, so it holds past the last marker. A wire's lean comes from where it is in the board's
  upper and lower halves.
- **The board's edges**: the markers sit on the near edge, so that edge is the strongest one within 25 mm beyond them; the far
  edge is looked for where the board's width (`neckWidthMm`) puts it, a mm across measured from the markers' printed size.
  Each is a line fitted through most of the points (`ransacLine`), so a hand over part of it doesn't move it.
- **The strings**: in the strip, a ridge filter up and down the board (a thin line running along it) in windows of 12 columns,
  looked for near where each string sits on a real board (7.5% in from each edge, evenly between). Each string is a fraction of
  the way across, fitted along the neck through most of what was found (`ransacLine`) and kept within 5% of where it sits, so a
  hand or a marker can't pull it across the board.
- A frame bigger than 1280 on its long side (Continuity Camera sends 1920 wide, whatever is asked) is read scaled down to it:
  the reader's sizes in px are tuned for that, and it reads faster.
- About 55 to 70 ms a frame at 1280 × 720, so it reads about 15 frames a second; the wires are eased between reads and kept
  half a second once the markers are gone.

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
| `model/cvFrets.ts` | Pure. The OpenCV reader's maths: the axis, the perspective fit, the board's edges, the wires and the strings from a strip; where a point is on the neck and where a heard note was played. |
| `client/cv.ts` | Browser. Loads OpenCV.js; finds and follows the markers, turns the frame into the strip, calls `readStrip`. |
| `model/cvFx.ts` | Pure. The OpenCV reader's settings, which frets are numbered, Neck fire's heat and flicker, Pick pulse's notes on screen and their chord; the chord layers: the chords sounding at a time, the notes coming next, a note's name or degree. |
| `client/hands.ts` | Browser. MediaPipe's Hand Landmarker, loaded once for both readers. |
| `ui/NeckCvView.tsx` | React. The OpenCV reader's canvas over a video: wires, numbers, strings, notes under fingers, Neck fire, Pick pulse. |
| `ui/CvControls.tsx` | React. Fret numbers, Strings, Notes under fingers, Neck fire and its Strength, Pick pulse; `useCv` keeps them. |
| `client/listen.ts` | Browser. Picks and their notes from a stream's sound, and how loud it is. |
| `ui/NeckView.tsx` | React. The canvas over a video: reads markers and hands each new frame, draws every animation frame. |
| `ui/FxControls.tsx` | React. Markers, Buttons, Covering, Effects (the mood effects with Strength and Beat, and Hide markers) and Test effects; `useFx` keeps them. |
| `js-aruco2.d.ts` | Types for the untyped js-aruco2. |

Tests: `tsx --test src/features/neckFx/model/*.test.ts` (the cached tsx).
