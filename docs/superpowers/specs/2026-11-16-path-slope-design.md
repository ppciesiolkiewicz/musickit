# The learning path as a slope: prerequisites, a computed order, and what's within reach (design)

Tasks: NEW13 (steps inside a concept), NEW16 (questionnaire in/out by step), and the "next step" rule NEW7 will need.

## Why

The path (`src/features/plan/model/path.ts`, 44 tracks, 216 steps) has four levels and a few `after` links. Inside a
level it says nothing about order. Lydian is "advanced" with no tie to pentatonic, though pentatonic gives a player most
of what they need and the modes ask much more. Small F and the first triads are both "beginner", so the path can't say
basic triads come first. Pentatonic Position 1 and "Major scale, root on 6" aren't joined.

The user wants the path more granular, not with more levels: a gradual slope where prerequisites set what is offered
first. There are no hard stops. A step a player hasn't rated "Easy now" is never a wall. The plan moves on and brings it
back later. Early on the path is close to one line; higher up, tracks run side by side more and more ("fading overlap").
The questionnaire still sets where each track starts (NEW9's placement).

## What exists (read before planning)

- `src/features/plan/model/path.ts`: `PATH`, `PathStep { level, name, holds, ladder?, after? }`, `stepAt`, `spanOf`,
  `stepOf`. `after` is "trackId:n", n from 1.
- `path.test.ts`: every old concept merged once (67), levels never go down inside a track, `after` points at a real
  step in another track at a level no higher than its own.
- `concepts.ts`: CONCEPTS is one concept per track, with `levels` and `steps`; the 67 old ids map to tracks.
- `src/features/plan/intake/placement.ts`: an answer (rung 0–3) places the player on each track of the topic:
  on / done / ahead.
- `/dev/path` (`src/app/dev/path/page.tsx`, `src/features/devtools/path/PathView.tsx`, `JourneyView.tsx`,
  `ProposalView.tsx`): the "Path" view (a block per level a track reaches, a ribbon, hover lights what a block builds on
  and leads to, a student overlay).
- `/dev/questionnaire` ("Concepts" marks a whole concept in or out; "Starting steps" shows placement).
- Double stops already exist in the app: `/theory/double-stops` (its tour in `src/features/guide/tours/double-stops.ts`)
  and the course, stage s1, section "5ths & double stops" (after the triads section there). There is no track for them.
- The prompt lists track ids (`PROMPT_VERSION` 2 in `src/features/plan/model/prompt.ts`).

## Goals

1. The prerequisites the user named are in the path:
   - Pentatonic before the modes: the theory modes, the modes on the neck, and singing the modes.
   - Pentatonic Position 1 (`pentatonic-positions:1`) before every other first position: `major-on-neck:1`,
     `arpeggios:1`, and `caged:1` (the E shape, the area Position 1 sits in; this last one is my call).
   - A new **double stops** track before triads, and basic triads (strings 3 2 1) before barre chords (`barre:1`).
2. A pass over all 44 tracks for more links like these, drafted by Fable agents and checked one by one.
3. Each step gets a place on the slope computed from the links. Nobody numbers steps by hand, and a new link moves
   things by itself.
4. One rule says, for a player, which steps are **known**, **within reach** or **ahead**. It is narrow at the start and
   wider higher up. /dev/questionnaire (NEW16), the plan writer (NEW7) and the teacher view all use it.
5. `/dev/path` draws the slope so the user can judge it.

## Non-goals

- No fifth `Level`. The four levels stay (decided in NEW13). Tools, the guide and placement keep using them.
- No gate in plans. "Ahead" ranks a step later; it doesn't forbid it. Nothing in this design blocks a player.
- Players still don't see steps.
- Not wiring the rule into the plan writer or the server (NEW7) yet. It's exported for that use.
- No new exercise tool. The double-stops steps are "not implemented" (no ladder) like most steps today; NEW11 weighs
  tools.
- Not settling NEW9's open question ("I play one pentatonic position" starts on Position 1). Note what the rule changes
  for it, nothing more.

## Anti-goals (would be a failure even if it works)

- A path that still reads as four buckets: steps in a level with no order between them.
- Hard stops: a player kept off something because a rating hasn't come in.
- Hand-kept numbers that drift from the links.
- A tangle of links nobody can check: every link has a reason a teacher would agree with.
- Cycles.

## The design

### Part A: the links

- Add the named links from Goal 1. The modes link to `scales:1` (minor pentatonic) or `pentatonic-positions:1` as fits
  the track (theory → `scales`, neck → `pentatonic-positions`, voice → `scales`). The modes keep their existing link
  to the major scale.
- New track `double-stops` in the guitar topic `guitar-caged` (with triads and CAGED), placed before `triads` in
  `PATH`. Draft steps, to be written with `teaching-voice` and checked with `npm run theory` and against
  `/theory/double-stops`:
  1. new: 5ths on two strings (root and 5th, the smallest power chord; the course's own way in)
  2. beginner: 3rds on two strings, in one key
  3. beginner: 6ths on strings 3 and 1 (or 2 and 4), in one key
  4. intermediate: double stops up the neck in one key
  Then `triads:1` gets `after: ["double-stops:2"]`, and `barre:1` gets `after: ["triads:1"]`.
- `merges` for `double-stops` is empty (a new track). The old-concept count stays 67; the track count becomes 45.
- **Agent pass.** Three Fable agents, one per area (guitar, voice, theory and ear). Each reads `path.ts`, this
  document, and two reference orders (musictheory.net's lesson list and the Open Music Theory contents). The builder
  scrapes both with the local firecrawl (`POST localhost:4001/v1/scrape`) into the scratchpad and hands the files to the
  agents; Open Music Theory's contents need its table-of-contents page, not the book's front page. Each proposes links for its area as a list of `{ from, to, reason }`. They don't edit
  `path.ts`. I read every proposal, keep the ones a guitar or voice teacher would agree with, and add them. Links
  across areas are allowed (a guitar step after a theory step).
- The test rule "an `after` is no higher than its own level" stays. A new test checks for cycles.

### Part B: the computed order

- **Predecessors** of a step: the step before it in its track, plus its `after` steps.
- **Depth** of a step: 0 with no predecessors, else 1 + the largest depth among its predecessors.
- **Order** on the path: by level, then by depth, then by track order in `PATH`. Exported as a function from `path.ts`
  (a name like `slope()` or `orderOf()`), pure and tested.
- A test pins the cases the user named: inside its level, `modes:4` (Lydian) comes after every `scales` and
  `pentatonic-positions` step it depends on, and `triads:1` comes before `barre:1`.

### Part C: known / within reach / ahead

A pure function in the plan model, beside `placement.ts` or in `path.ts`. Its input is what's known for a player and
their level per area. Its output is a mark for every step.

- **Known**: a step under the player's starting step (placement), or one whose newest rating is Solid or Easy now
  (NEW13's "solid"). A step practised but not solid is not known, so it stays within reach and comes back.
- **Known carries back** (my call): every predecessor of a known step is known too, and so is every predecessor of a
  starting step, all the way down, across tracks and topics. A player who says they know Dorian knows the pentatonic
  and major scale steps it rests on; `triads:5` rated solid makes `triads:3` known. This also keeps a starting step
  from showing "ahead" because a topic was left unanswered.
- **A starting step is always within reach** (my call), and the cap below never pushes it out.
- **Within reach**: not known, and every predecessor known.
- **Ahead**: everything else.
- **Fading overlap**: a cap on how many within-reach steps each topic offers (per topic, decided with the user: a day
  mixes chords, technique and scales, so one next step per instrument would be too narrow). The cap is set by that
  topic's own questionnaire line (my call); an unanswered topic counts as new. My call on the numbers, easy to change
  in one place: new 1, beginner 2, intermediate and advanced no cap. The steps
  kept are the lowest on the slope (Part B). The steps over the cap are marked "ahead" but flagged "open", so the plan
  writer can still reach them when nothing else fits.
- Ratings aren't wired in yet on /dev/questionnaire; there "known" comes from placement alone. The function takes
  ratings as an input so NEW7 and the teacher view can pass them.

### Part D: what the user sees on the dev pages

- **/dev/questionnaire "Concepts" (NEW16):** each track shows its steps marked known / within reach / ahead for the
  answers given, instead of one in/out per concept. It reads Part C. Whether "Starting steps" stays as its own panel or
  folds into this one is the builder's call.
- **/dev/path students** (my call): the example students (`EXAMPLE_STUDENTS` in
  `src/features/devtools/model/stepProgress.ts`) get questionnaire answers that fit their ratings, so their marks come
  from both.
- **/dev/path "Path" view:** inside each level, a track's blocks sit in slope order, and the order is visible (a depth
  number or the steps laid left to right by depth). Hover keeps lighting predecessors and what follows. With a student
  picked, steps get the Part C marks. The exact drawing is the builder's call; screenshot it for the user.

### Versions and words

- Adding a track changes the track ids the prompt lists, so raise `PROMPT_VERSION` to 3 with a changelog entry in
  `src/features/plan/model/CHANGELOG.md`.
- Step names and `holds` are read by teachers: write them with `teaching-voice`. Theory facts go through
  `npm run theory`.
- Keep `src/features/plan/README.md` and `CLAUDE.md`, and the intake README, true in the same commit. Update NEW13,
  NEW16 and NEW9 in `tasks.txt`.

## Order of work

1. Part A, the named links and the double-stops track, with the cycle test. Commit.
2. Part B, the computed order, with tests. Commit.
3. /dev/path draws the slope. The user judges the named links on screen before step 4.
4. Agent pass (Part A); add the kept links. Commit, with a list of links kept and dropped and why.
5. Part C, the rule, with tests.
6. /dev/questionnaire per-step marks (Part D). Commit.

## Left to the builder

- Exact double-stops step names and the strings they use (within the draft above, checked with the calculator).
- The function names and where Part C lives.
- How /dev/path and /dev/questionnaire draw depth and marks.
- Which agent-proposed links to keep, with the reasons written down.
