# Chords under melodies and runs, and piano intro music for videos

Date: 2026-11-01. Areas: `src/features/theory` (working the chords out), `src/components/theory/singing/MelodyStaff.tsx`
(drawing them), `src/features/exercises/basics` (melody-singer, run-singer, `singer.tsx`), the Singing page
(`src/components/theory/singing/SingingApp.tsx`), and videos (`src/features/teachers/video`, `src/features/stage`).

## Why

A sung melody or run on its own doesn't say what key it is in. That is hardest in runs, which climb a semitone each
pass: the singer has to find the new Do with nothing to lean on. Singers usually hear it from the piano. In the bar
where the long Do is held, the piano plays the chord of the key just sung and then the chord of the next key, so the new
key is in the ear before the next pass starts. Chords under ordinary melodies help in the same way: they place every
note against the harmony and make the tune easier to pitch.

The main user is the AI practice plan (`src/features/plan`), through the `melody-singer` and `run-singer` exercises.
The Singing page and the videos share the same staff and should get the same chords.

Separately, a video should be able to open with a simple piano melody under the intro title instead of silence.

## Goals

1. Every book tune and every run has chords, one per bar, **worked out from its notes**. There is no hand-written chord
   data anywhere, and no override in the notation (the user ruled that out explicitly).
2. The chords are **written on the staff** (a name above each bar, lit while it sounds) and **played on time** by the
   piano, with the tune.
3. **Key-change chords in runs:** the last bar of every pass but the last becomes a quarter-note Do and three quarter
   rests. The chord of the bar before rings on under the Do, the current key's home chord is struck on beat 2 and the
   next key's on beat 3, ringing through beat 4 (C → D♭). The next pass follows straight on. Nothing extra is added in
   front of the first pass and no bars are inserted.
4. A video config can give the intro **music**, a tune the piano plays with its chords under the intro title.

## Non-goals

- No chord notation in tunes, no per-tune chord overrides, no editor for chords.
- No backing band, pads, bass, drums or second instrument. It is the same piano.
- No new chord vocabulary beyond the scale's own chords on degrees 1, 4 and 5, plus the home chords of the keys a run
  passes through.
- No change to how tunes are placed in a voice, to the runs' keys, or to the video's layouts and formats. The only
  change to a run's notes is the shortened Do of goal 3.

## Anti-goals (it works but it's wrong)

- Chords that drown the tune. The melody must stay clearly the loudest line.
- Chords that clash with a held Do or with the strong beats of a bar. (This is why the run's Do is cut to a quarter
  before the key change.)
- A key change that lands on the wrong beat or behind the next pass's first note.
- Chord names on the staff that don't match what is heard (a C written while an F sounds), or that disagree with the
  key spelling of the notes (D♭ written over notes spelled C♯, D♯). The user's own sketch had exactly that mismatch;
  keeping one spelling per key is my call.
- A video whose pixels or sound differ between two renders of the same config. Videos must stay deterministic.

## How the chords are worked out (decided)

- **One chord per bar.** For every bar except the last bar of a pass, choose among the scale's chords on degrees 1, 4
  and 5 (C, F, G in C major) the one that best covers the bar's notes, weighted towards the strong beats (beat 1 most,
  then beat 3) and by how long each note sounds. A tie goes to the home chord, then to 5, then to 4.
- **The last bar of a pass** is scored like any other bar. Book tunes and runs end on a held Do, so it comes out as the
  home chord; a video tune ending elsewhere just gets its best-fitting chord, and the config needs no new check. *(my
  call)*
- **Runs, the key-change bar** (confirmed by the user from their own sketch). In the last bar of every pass except the
  last:
  - beat 1: Do as a quarter note; no chord is struck, the chord of the bar before keeps ringing under it;
  - beat 2: a quarter rest; the current key's home chord is struck (C);
  - beat 3: a quarter rest; the next key's home chord is struck (D♭);
  - beat 4: a quarter rest; D♭ keeps ringing. The next pass starts on the following beat 1.

  The staff draws it that way: a quarter-note Do, three quarter rests (the staff needs a rest glyph it doesn't have
  today), and the names "C" and "D♭" above beats 2 and 3. The voice bar and the mic simply follow the shorter Do. The
  last pass keeps its whole-note Do over the home chord. *(the last pass is my call)* The shortened Do belongs to the
  run as placed (`placeRun`, or a step right after it), so the staff, playback, mic and videos all get the same notes.
- Any other place one tune is followed by another in a different key is out of scope for now: today only runs change
  key.
- Chord names are spelled in the key the notes are spelled in: the key a run pass's ladder uses, as `placeRun` already
  spells it.
- This is pure logic in `src/features/theory` with tests, next to `placeTune` / `placeRun`, and works from the placed
  notes. Its output is a list of chords, each with a start beat, a length in beats, a name and the notes to play.

**Builder's call:** the exact scoring weights; how a scale that isn't major is handled (use that scale's own triads on
1, 4 and 5 where it has seven notes, and only the home chord where it has fewer, e.g. pentatonic); whether a bar of a
sixteenth run that changes harmony mid-bar is still one chord (yes, one per bar, keep it simple).

## How they sound (my call; the user did not specify)

- The same shared piano as the melody, at a clearly lower velocity, voiced as a close triad in a fixed middle register
  (around C3 to C4): below the tune where it has room, otherwise around it, and never under the app's lowest note
  (`RANGE_MIN`, C2). Low voices (bass, baritone) therefore hear the chord at or above the tune, not muddy below it.
  *(my call)*
- Each chord is struck once at its start and held for its length (slightly less, as the melody notes are).
- Wherever a tune plays (the exercises' Play button, the Singing page's play, a video's soundtrack), its chords play
  with it on the same clock. Tapping a single note plays just that note, with no chord.

## How they look (my call)

- Each chord's name (plain triads: C, F, G, Dm, …; no sevenths) is written above the staff at the beat it starts, in the staff's ink, lit in the "played" sky colour while it sounds. The key-change bar shows two names, at
  beats 2 and 3.
- The staff grows taller only by the room the names need; the following views (full screen, videos) keep the bar and
  the names in step as they scroll.

## Where it shows up

- **`melody-singer` and `run-singer` (primary, the plan):** chords on by default. A new optional prop `chords`
  (boolean, default true) turns them off for an exercise where the tune alone is the point; a run with chords off keeps its whole-note Do in every pass, as today. *(my call)* Document it in the
  `*.props.ts` files, regenerate `docs.generated.json`, and parse it in the plan's `model/tools.ts`.
- **Singing page:** the same chords on its staff and in its playback, with a toggle in its settings, on by default.
  *(my call: it shares the staff and placement, so leaving it out would mean two behaviours of one component)*
- **Videos:** every tune's passes get their chords in the soundtrack and on the staff. Since a video has one key today,
  the last bar of each pass is the home chord.

## Video intro music (decided)

- `intro` gains an optional `music`: `{ "tune": <notation or book number>, "times": <1 to 16, default 1> }`, checked the
  way timeline tunes are checked, with errors naming the field (`intro.music.tune: …`).
- During the intro, the piano plays that tune with its chords, `times` times straight on. There is no click, no
  countdown and no "sing it" wording.
- With music, the intro lasts exactly as long as the music (its passes, in whole bars, at the config's bpm), and
  `seconds` is ignored. Setting both is not an error. Without music, nothing changes: the intro is silent for `seconds`.
- The staff shows the intro tune with the bar running over it, as a tune is shown when it is sung. The `progress` widget
  shows "Listen" during the intro, the `next` widget "First up", and the intro title and text stay up for the whole
  intro.
- When the music ends, the first tune's countdown starts on the click as it does now.
- The intro tune is placed in the voice's range the same way timeline tunes are, so it shares their key, octave and
  clef.
- No new layers or rects. The existing `melody`, `intro`, `progress` and `next` layers are used.
- Update `spec/video.md` and an example config, e.g. give `videos/c-major-first-steps.json` intro music.

## Constraints

- Follow each feature's `CLAUDE.md`: the theory and video models stay pure and tested; the exercises' docs are generated
  and never hand-edited; nothing embedded writes the address bar; the stage widgets stay injectable.
- Tests run with the cached tsx (`npx tsx` hangs here), plus `tsc --noEmit` (ignore `.next/` lines) and eslint.
- Videos must stay deterministic. Chords are part of the score (`buildScore` / `soundOf`), not timers.
- Work goes straight to `main`, with temp-index commits, because other sessions have uncommitted work in the checkout.

## Order of work

1. The chord logic in `src/features/theory`, with tests (tunes, runs with key changes, the last bar, spelling).
2. `MelodyStaff` draws chord names; a shared helper turns placed notes + chords into playback steps.
3. `melody-singer` and `run-singer` (with the `chords` prop and plan parsing), then the Singing page.
4. Videos: chords in the score and soundtrack, then intro music.

## Left to the builder

- Data shapes, function names, file layout within the areas above.
- Scoring weights for picking a chord, voicing details, exact velocities.
- How the staff makes room for the names and how they are laid out at small widths.
- Test cases beyond the ones named above.
