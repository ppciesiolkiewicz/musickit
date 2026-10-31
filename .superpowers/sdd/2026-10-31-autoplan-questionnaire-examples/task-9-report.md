# Task 9 report: Example library

**Status:** DONE. Commit 57863bf `feat(plan): example library of exercises and 7-day plans` (on main, not pushed).

## What was implemented

- `src/features/plan/examples/`: `README.md` (format, rules, how to add one), `index.ts` (static JSON imports;
  `ExampleMeta` with `areas` only per the ruling, no `area` field; `ExerciseExample`, `PlanExample`, `EXERCISE_EXAMPLES`,
  `PLAN_EXAMPLES`), 15 exercise JSON files, 4 plan JSON files, `examples.test.ts`.
- `src/features/plan/README.md`: code map line + "Example library" section.
- `package.json` `test` script: added `src/features/plan/examples/*.test.ts` (the plan model glob doesn't reach it).

Exercises: one per area x level (guitar/voice/theory x new/beginner/intermediate/advanced) + 3 showcases
(`blocks`, `pick`, `progression`). Plans: guitar-beginner (20), guitar-intermediate (30), voice-beginner (15),
guitar-theory-intermediate (30); 7 days each, 4 exercises a day, every day totals its minutes exactly.

## Tests (examples.test.ts)

The 8 from the brief, plus two extra:
- `fits the parser's limits, so nothing is cut on paste` (<= 6 tools, <= 24 sections, text/heading/list/title/focus/why lengths; the parser truncates silently).
- `named notes are lit in the tool after the text, and the root is never muted`: for every `{{x}}` in text/list,
  the first rooted tool after it, when it is a scale-neck/staff/arpeggio-neck, must draw that note unmuted (highlight
  with muted others / staff `notes` / arpeggio `part` respected); every such tool must keep its root lit. Mutation
  check: removing "1" from a showcase highlight made it fail with `{{1}} not lit in the scale-neck after "Add {{3}} (E)…"`; reverted.
- The JSON test also checks every file's `id` = file name and that every file on disk is loaded by index.ts.
- Block test also asserts each block is 2-5 minutes.
- Additionally verified by script (not a test): no two exercises with a shared tag side by side in any plan day; 2-5 exercises per day.

### RED
`tsx --test src/features/plan/examples/examples.test.ts` before index.ts/JSON existed:
```
Error: Cannot find module './index'
✖ src/features/plan/examples/examples.test.ts
ℹ pass 0
ℹ fail 1
```
Expected: the library didn't exist yet.

### GREEN
`tsx --test src/features/plan/model/*.test.ts src/features/plan/examples/*.test.ts`:
```
ℹ tests 110
ℹ suites 16
ℹ pass 110
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 382.875875
```
(examples.test.ts alone: 10/10 pass.) `npx tsc --noEmit | grep -v '^.next/'`: empty. `npx eslint src/features/plan`: clean.

Issues the tests caught while writing, fixed: "leaves room for each bend to sing" in a playing exercise (sing+play
warning) → "ring out"; a 6-minute block → 5+5.

## Table

| id | area | level | minutes | blocks | tools |
|---|---|---|---|---|---|
| guitar-advanced-dorian-on-the-neck | guitar | advanced | 12 | 3+3+3+3 | play-along, scale-neck |
| guitar-beginner-pentatonic-box1 | guitar | beginner | 10 | 3+2+3+2 | backing-band, scale-neck |
| guitar-intermediate-joining-boxes | guitar | intermediate | 12 | 3+3+3+3 | backing-band, play-along, scale-neck |
| guitar-new-em-am-changes | guitar | new | 8 | 3+3+2 | chord-shapes, play-along |
| showcase-blocks-do-mi-sol | guitar (blocks) | beginner | 8 | 2+2+2+2 | play-along, scale-neck |
| showcase-pick-step-tunes | voice (pick) | beginner | 6 | 3+3 | melody-singer |
| showcase-progression-four-ways | guitar (progression) | intermediate | 12 | 3+3+3+3 | backing-band, chord-shapes, play-along, scale-neck |
| theory-advanced-modes-by-ear | theory | advanced | 10 | 3+3+4 | click-drone, play-along, staff |
| theory-beginner-one-four-five | theory | beginner | 8 | 3+3+2 | chord-shapes, play-along, staff |
| theory-intermediate-seventh-chords | theory | intermediate | 9 | 3+2+4 | arpeggio-neck, interval-ears |
| theory-new-major-or-minor | theory | new | 6 | 2+2+2 | interval-ears, staff |
| voice-advanced-guide-tones | voice | advanced | 12 | 3+3+3+3 | melody-singer, play-along, run-singer |
| voice-beginner-do-mi-sol | voice | beginner | 9 | 3+3+3 | click-drone, melody-singer, play-along, staff |
| voice-intermediate-leaps | voice | intermediate | 10 | 3+2+3+2 | click-drone, interval-ears, melody-singer, run-singer, staff |
| voice-new-matching-a-pitch | voice | new | 6 | 2+2+2 | click-drone, staff |
| guitar-beginner (plan) | guitar | beginner | 20/day | 28 exercises | backing-band, chord-shapes, finger-pattern, play-along, scale-neck |
| guitar-intermediate (plan) | guitar | intermediate | 30/day | 28 exercises | arpeggio-neck, backing-band, chord-shapes, legato-trill, picking-drill, play-along, scale-neck |
| guitar-theory-intermediate (plan) | guitar+theory | intermediate | 30/day | 28 exercises | arpeggio-neck, chord-shapes, interval-ears, legato-trill, picking-drill, play-along, scale-neck, staff |
| voice-beginner (plan) | voice | beginner | 15/day | 28 exercises | click-drone, interval-ears, melody-singer, play-along, staff |

## Content decisions

- Singing exercises: never "play"/"strum" (only "Press Play", "the chords take turns"); drones, staff with mic,
  melody-singer/run-singer by `pick`, play-along as accompaniment. Bare drills are <= 3-minute blocks.
- Theory exercises are listening/tapping (staff `mic: false`, interval-ears, chord-shapes to tap, play-along to listen),
  so they suit any student.
- Lighting: highlights always include "1" (or use `others: "normal"` so the root and the line both stay lit).
- `chord-steps` shapes whose text uses `{{b3}}` omit the shape `key` so inline degrees count from the first chord (noteText reads a shape key first).
- Stubs used in the guitar plans: finger-pattern (spider), legato-trill, picking-drill (incl. `skip`).
- Melodies on guitar via play-along `melody` (tunes 16, 20, 22, 36, 47 checked for the note content the text describes).
  Voice melodies always by `pick`; every pick resolves exactly (no inexact warning).
- One style sentence at most per exercise ("the scale used in blues and rock", the blues day in plan 4).

## Concerns

- Visual check in the browser not done (no browser session here); deferred to Task 11 as allowed. Things worth
  looking at there: `placement: {by: "fret", fret: 12}` for E minor pentatonic and `{by: "fret", fret: 5}` for C
  major pentatonic pick the intended box; chord-shapes renders `A5`/`D5`/`E5`; two-scales neck/notes view.
- The lighting test covers scale-neck/staff/arpeggio-neck only; notes named before a play-along (solo-over targets,
  chord-steps lines) are lit by the shape itself and are not checked automatically.
- `package.json` touched (one glob added to `test`); nobody else had it modified.
- Unrelated uncommitted files from other sessions left alone (.claude/settings.json, PromptAndPaste.tsx, devtools/prompt, app/dev/prompt).

## Fix round 1
- voice-new-matching-a-pitch: added click-drone (c, 60 bpm, click off) before the staff in "Step to Re and home".
- guitar-beginner day 2: text and focus now one strum per beat (quarters).
- guitar-new-em-am-changes: text now "one bar each, Em, Am, Em, Am".
- showcase-progression-four-ways: chord-shapes draws open G as low E 3, A 2, D/G/B open, high E 3; text now says so (B string was wrong).
- "twenty": interval-ears has no 20-question round (running per-answer tally only); reworded in guitar-theory-intermediate (days 1, 7) and voice-beginner (day 7) to refer to the tally.
- Tests: tests 110, pass 110, fail 0, cancelled 0, skipped 0, todo 0.
