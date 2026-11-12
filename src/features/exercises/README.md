# Learning components

The views and the guided player the AI practice plan (`src/features/plan`) draws from. The plan only parses and
migrates; the components, their props and their docs live here.

## Layers

0. `timeline/` pure model: events, degrees, repeats, derived time. No React, no sound.
1. `shapes/` six play-along shapes (`progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`, `solo-over`);
   `expandShape` turns a shape into a timeline. A step is "strum", a degree, or a grip (`{ grip: ["1","3","5"], strings: "321" }`:
   notes struck together on chosen strings, a triad or a double stop), so `chord-steps` and `progression` can mix them into riffs.
2. `cues/` voicings, cues, tab and `chordCues`: what to show at each moment (`gripCells` puts a grip's notes on its strings, closed and within 4 frets, nearest the last grip); `visibility.ts` (each note hidden, muted,
   normal or highlighted, from two layers: `enable`, the notes in play, and `highlight`, those of interest) and `placement.ts` (which box, maybe an octave down, a `placement` asks for). Pure.
3. `play-along/` `PlayAlong`, the `guitar-play-along` tool (one clock, tab / notes / neck views), `schedule`, `solo`. Under single notes over bare
   chords it holds each chord (`withBackingSound`, the `under` prop: chords, drone, none). The neck view is the shared
   `ScaleNeck` with every place of the line at once (the playing chord's enabled notes normal, the highlighted ones
   ringed, the rest muted, the sounding ones lit); the notes view is the shared `SingingStaff`. Both label notes by the label setting and its "count from". `PlayerParts.tsx` is the player look shared with the backing track (card, round Play, tempo, beat meter, chord cards that keep one colour a chord), used by the play-along and `strum-along`.
4. `basics/<name>/` the basics: `scale-neck` (its position boxes; with `parts` also the whole neck above them, the same marks on both, and chips to show or hide a part), `choice` (a row of chips, not a tool: a section's choice, "Stage 1", "Variant 2" or plain values: in an exercise the step sets its other tools to the picked option's key, tempo, position and level), `chord-shapes`, `staff` (a "Start microphone" button; with `drone` / `click` its own backing with its own Play; with the mic its notes carry degree or solfège `labels`; its settings show as tags: key, voice, drone, click), `backing-band` (click, drone, drums and bass, each part offered `"on"`, `"off"` or `"always"`), `backing-track` (the backing tracks page's player, `BackingPlayer` from `@/features/backing`, set up from a curated progression or the lesson's own numerals, key, style, tempo and the parts that start muted, never saved; it is also the chords under a singer), `note-finder`,
   `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer` (both with a chord a bar under the tune, worked out
   in `features/theory/melodyChords.ts`; a run announces each new key in its held-Do bar), `strum-along` (a metronome and the chords as boxes,
   one per bar or beat, each holding beat boxes of its strumming pattern, the playing strum lit; its maths in `blocks.ts`), `string-singer` (the guitar's open strings sung along, at the guitar's own pitch: the strings, neighbouring pairs or the 5th-fret unisons; `strings.ts`), `interval-singer` (a named interval to sing from Do, "Interval · P5": Do sounds and sits on a piano roll, the default, or a staff; held on the other note it counts and shows; `dot: false` hides the voice, the harder way; `picker: false`, as an exercise draws it, leaves out the Keys switch and key chips; on a touch screen the mic is open only once the piano has finished, since a phone plays everything much quieter while the mic is open; `asks.ts`, `IntervalRoll.tsx`). `breathwork` (breathing for singers, no mic: a circle that fills and empties with the breath and counts each phase, a strip of every phase, a tick per count and a chime per change on the audio clock, no spoken voice; drills `farinelli` (`from` to `to` counts), `sss-zzz`, `zzz-sss`, `cycles`, `long-exhale`, `body-scan` (`seconds`, `rounds`); the pure plan in `breaths.ts`, the sounds in `sound.ts`). `video` (a practice video of the library by its id, in `VideoPlayer` from `@/features/videos`, with the browser's own controls; the prompt lists only published videos). Each has `index.tsx` (the View) and `<name>.props.ts`.
   Shared: `levels.ts` (what a `level` stands for on each tool that takes one, as data: the plan's parser fills the settings in, the views never see a level; each tool's `level` prop says the same ladder in words, for the prompt), `choices.ts`, `arpeggio.ts`, `singer.tsx` (the two singers), `sing-along/` (their player: play, stop and
   mic as icons, what is heard switched on and off as a row (the tune, its chords when it has them, a metronome on the tune's
   beats: the singers' `metronome` prop, on by default for `string-singer`), a loop set by two markers on a strip of the tune, its passes laid end to end on an endless staff or a
   piano roll that keeps the voice's line, and a full screen page modal where the notes slide under a still bar; `passes.ts` is the pure model). Three more are guitar drills, each shown as tab with the fretting finger and pick stroke under every note, and a play button (`DrillPlayer.tsx`; the pure steps in `drills.ts`): `finger-pattern`, `picking-drill`, `legato-trill`.

`docs/` extracts each `@component` props file with the TypeScript compiler API into `docs.generated.json`
(`COMPONENT_DOCS`); a test fails when it is stale. Regenerate with `npm run docs:exercises`.

Settings come in three reaches. App-wide stores: the volume (`useVolume`, a master gain after the output bus, so the looper's tap stays at full level), the singing accuracy (`useAccuracy`) and the note labels (`useLabelSystem`). Per exercise: the melody view (staff or piano roll, the melody and run singers alike; `ExerciseSettings` in `src/components/practice/exerciseSettings.tsx`, wrapped round each plan exercise). Per tool: tempo, metronome, looping, as the tool's own state. `ToolSettings` (`src/components/practice/`) shows them on a tool: the volume inline, the rest behind a sliders button (`Dropdown`); the staff and the sing-along player have it. A staff written with `labels` leaves out the labels choice, since it doesn't follow the setting.

`src/components/practice/exerciseStep.tsx` is an exercise step (the plan's `Cells` wraps each section in one):
a tool hands it what it can start with `useStepPart` (the staff's mic and backing, `backing-track`, the play-along, the
singers, `PracticeBand`), and `StartExercise` ("Start exercise" / "Stop exercise") shows when the step has more than one kind
of thing to start. It starts the first part of each kind (one drone, not three) and plays them in one audio focus group
(`takeAudioFocus`'s `group`), so they don't stop each other; Stop stops every part, also those started by hand.

## Tests

`src/features/exercises/*/*.test.ts` and `*/*/*.test.ts` are in `npm test`.
