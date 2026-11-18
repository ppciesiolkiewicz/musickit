# ChoiceSplit: one block, many versions, rolled by the composer

Date: 2026-11-18. Task: tasks.txt, "TaskSeries ChoiceSplit". Part of the NEW release (user, 2026-11-18).
Builds on the keys work (cd4fc1e5, 14a8a044): `model/keys.ts`, `PlanExercise.keys`, `withKeys`, `explainDay`.

Lines marked **(user)** were decided by the user. Lines marked **(call)** are the designer's and can be overruled.

## Why

- A player was shown an exercise in a key that made no sense as a start (user). Only blocks with a Key selector follow
  the player's keys today: 66 of 144 seed blocks, 15 of 53 guitar blocks.
- A new alternative of an exercise (another key, a faster tempo, the next position) is a new block file today, or a
  hand-written choice inside the block. The user wants the algorithm to make sensible alternatives of one block, with no
  new block for each (user).

## What it is

A block says what may change about it (`moves`). The composer decides, for each exercise it picks, which version the
player gets: it reads the last version this player played and how they rated it, lists the moves that are in, weights
them, and rolls its seeded die. The values it rolled are stored on the slot. The card draws the block with those values:
tools moved, text params filled, chips for the values kept from before.

## Goals

- Every movable block opens in a key from the player's own keys, whatever the block's level: an advanced player gets a
  basic exercise in any of their keys (user).
- After a rating, the next time the block comes up the version may move: faster, more keys, the next position (user).
- The pick is by probability, in both directions: ratings tilt the dice, they never force one outcome (user).
- A new version keeps a bit of the one before, for example keys A and G where A was last time's (user).
- Every roll can be seen on a dev page: the moves in, the weights, the roll, the rating that tilted it (user).
- Block text accepts params for the given values (user).
- Start with a small batch of example blocks; agents rewrite the rest after (user).

## Non-goals

- No neural network, decision-tree library or training data. The rules are a hand-written table of weights, kept as
  data behind one function, so a learned picker can replace it later (call; the user offered "just have an algorithm").
- No connector table between blocks and plans (ChoiceSplit2 is not built). Nobody hand-picks a version for a plan, so
  the values live on the slot. `practice_plan_blocks` stays block id + minutes (call).
- No values set by hand by a teacher. Teachers' weeks get the composer's roll. Later a teacher may adjust per level,
  still through the composer (user); out of scope, but the weights being data leaves room for it.
- No moves of `level` or `scale`: they change which path step a block practises, and picking steps is the composer's
  other job (call).
- No backfill script. Prelaunch: stored plan data may be reset, with the user's go each time.

## Anti-goals

- A player's first sight of an exercise in a key outside their keys.
- Two new things at once (faster and a new key in one roll).
- A low rating on a harder version pulling the player's step down (see "Ratings").
- Text that points at chips that are not there, or names a key the tool is not in.

## Keys on the path (user, 2026-11-19)

The order of keys belongs to the path, not to one ladder per area: "students should first do position 1 in A and then
position 1 in G and E" (user).

- A track in `path.ts` may state its key order, in groups, first key first: pentatonic positions `[[A], [G, E], …]`
  (the later groups are the builder's to fill with `npm run theory`, the user reads them). A track with none uses its
  area's ladder (`KEY_LADDERS`).
- A step has key stages, inside the step: stage 0 is the track's first group, stage 1 adds the next group, and so on.
  A key stage is not a path step: the next step may open alongside it (user). The user's example:
  - day 1: position 1 in A;
  - day 2: position 1 in A and G; position 2 in A (or in A and G).
- A stage opens on a step when the player rated 4 or 5 a play of that step that opened in a key of the stage before.
- The first play of a block opens in the track's first key, whatever key the author wrote the tools in and whatever
  the area's rung is. That is the fix for the weird first key: today a beginner's rung is E alone, and E is not where a
  pentatonic position is learned.
- The answer to the keys question (`PlanAnswers.keys`) starts a player that many stages along on every track, so an
  advanced player gets a basic exercise in more keys (user).
- Keys are earned per track: a key earned on one block of a track counts on every block of that track, so a later
  step's first play may open with them (the "or in A and G" above). That is the key crossing; nothing crosses tracks.
- A block that names steps of two tracks takes the key order of the first step it names (call).

## First slice (user: "start small")

- In: `moves` for key and bpm; `given`; the roll; text and title params; the app's line beside the chips; the key
  order on one track (`pentatonic-positions`) with key stages; the roll on /dev/compose and the key stages on /dev/path.
- Three seed blocks rewritten by hand to the new shape: `guitar-beginner-pentatonic-box1` (key and bpm),
  `guitar-beginner-down-up-picking` (bpm), one chord-shape block (key fixed, bpm moves). The user reads them drawn.
- Later slices: position moves; key orders for the other tracks; a voice block; the /dev/library version switcher; the
  agents' rewrite of the other blocks. Old-shape blocks keep working as they are throughout.

## The block: `moves`

A field on the block, beside `title` and `cells`. Part of the content, so part of the block id.

```json
"moves": {
  "key": "any",
  "bpm": { "from": 60, "to": 100, "step": 10 },
  "position": [ { "at": 1 }, { "at": 2, "after": "pentatonic-positions:3" } ]
}
```

- `key: "any"`: the block can be played in any key. Absent: the key is the lesson (the 21 chord-shape / strum-along
  guitar blocks); it keeps the key it is written in and is never given keys.
- `bpm`: the tempo range the block makes sense in. `from` is where a first play starts.
- `position`: the positions it may be played in, in order. `after` names a path step the player must have reached
  (solid or open, `reach()`) for that position to be in; without it the position is always in. A block whose own `steps`
  are position steps (track `pentatonic-positions` and the like) declares no `position` move: the position is its
  lesson (call; `seed check` enforces it).
- Every part is optional. A block with no `moves` is fixed and drawn as written.
- Tools are written at the starting values: the first key the author chose, `from`, the first position. Drawn with
  nothing given, the block is right as it stands. A tool keeps its own value for a part in `pinned`, as today.
- `moves` is the block's, never a section's (call). Today every seed choice sits on a section (96 choices in 86 blocks);
  after the split a block has one version per play, which is what a rating is remembered against. A move reaches every
  tool in the block that can follow the part and has not pinned it; a tool that must stay put pins the part (`pinned`).
  - `key` moves each tool by the distance from the block's written key, as `transposeTool` does today.
  - `bpm` moves each tool by the distance from `from` (`now - from`), clamped to the tool's range, so a block with a
    slow section at 60 and a faster one at 80 becomes 70 and 90. `from` is the bpm of the block's first tool that has
    one.
  - `position` sets the necks that show one position.
- The chips of a part are drawn once for the block, before its first tool, where a block's own choice is drawn today.
- A new-shape block has no `options` choice that sets `key`, `bpm` or `position` (call). An `options` choice on a
  section stays in the format for `scale` and `level` only (11 seed choices set a scale, 1 a level): comparing major
  with minor in one sitting is the lesson, not a version. The two seed "variant" choices that set key and position
  side by side become two sections. The open choice (`{ "key": "a", "scale": … }`, the key bar on notes) is untouched.

## The slot: `given`

`PlanExercise.given` replaces `PlanExercise.keys` (call). The slot's, like minutes: never in the block id.

```ts
given?: {
  keys?: { now: number[]; back: number[] };      // PlayerKeys, as today
  bpm?: { now: number; back: number[] };         // back: earlier tempos, nearest first, at most 2
  position?: { now: number; back: number[] };    // at most 2 back
  moved?: number;                                // how many moves this version is from the first-play one; absent: 0
}
```

- `now` is what the exercise opens in. `back` is what is kept from before, drawn as chips after "Earlier" (the wording
  the Key selector has today).
- Chips are drawn for a part only when it has more than one value. One value: no chips.
- `applyGiven(block, given)` (pure, in `model/`, replacing `withKeys`) builds the drawn block: per part a selector with
  `now` first then `back`, tools moved with the same `PARTS[...].apply` machinery `applyChoice` uses. `ExerciseCard`
  calls it at draw time, as it calls `withKeys` now.
- A stored plan with the old `keys` field: read as `given.keys` by `sanitiseState` or dropped, builder's choice; a
  composed day lives one day.

## Text params

- The title, a section heading, and text and list cells may name a given value (today's titles and headings hold them:
  "A minor pentatonic, position 1", "Position 1 at 60"): `{{=key}}`, `{{=bpm}}`, `{{=position}}` (call on the syntax: the `=`
  keeps them apart from the note dots `{{3}}` and `{{c-sharp}}`; `model/noteText.ts` splits them out).
- A param reads the value the part is at right now: the picked chip, else `now`, else the tool as written. So the text
  follows the chips. `{{=key}}` draws the key's name ("A"), `{{=bpm}}` the number, `{{=position}}` the number.
- A param for a part the block has no move for, or no tool with that value, is a paste warning and `seed check` failure.
- Block text never mentions a selector (call, user agreed in principle). When chips are there, the app writes one
  standard line beside them, per part (what the chips change, that the earlier values are after "Earlier", what Play
  starts again). Written once, with `teaching-voice` and `design:ux-copy`.
- The standing rule holds: text never carries frets, fingerings or note lists the tool shows.

## The composer: rolling a version

A pure function in `model/` (say `moves.ts`): `rollVersion(block, player, history, rng) -> { given, trace }`, called by
`explainDay` where `keysFor` is called today, after the blocks are picked (a roll changes no pick).

Inputs:
- the block's `moves`;
- the key order of the block's track, the key stage open on its step and the keys the player has earned on the track
  ("Keys on the path");
- `history`: this player's progress-log rows for this block id, newest first, each with the `given` it was played with
  and its stars;
- its own rng, seeded from the player, the block id and the newest rated row's id (first play: player and block id
  only), not from the day (call). So a version is rolled once per rating: it stays the same on every compose, every
  "Get another plan" and every day until the player rates the block again. An unrated play leaves no row, so nothing
  changes, and nothing new has to be stored.

First play (no rated row for this block):
- key: the track's first key (further along for a player whose keys answer starts them there). When the player has
  earned more keys on the track, 50% it opens with those too (`now` at most three), the first key kept (call on the
  number). The block's level plays no part (user).
- bpm: `from`. position: the first one. No `back`.

Later plays, from the newest rated row (an unrated play is not a low rating: it changes nothing, the version stays):

| Last rating (stars) | Roll |
|---|---|
| 1-2, Can't do it yet | 70% the version before, 30% the same again |
| 3, Same again | 70% the same, 30% one move |
| 4-5, Easy now | 80% one move, 20% the same |

- "One move" is one part, chosen by weight among the moves that are in: `bpm` 3, `key` 2, `position` 1 (call; all
  numbers on this page are starting values, kept in one exported table, tuned on /dev/compose).
- A move is in when the block declares it and there is somewhere to go: `bpm` below `to`; a key of a stage open on the
  block's step that this block has not been played in; a next position whose `after` the player has reached.
- What a move does:
  - `bpm`: `now` goes up by `step`; the old `now` goes first in `back`.
  - `key`: one key is added to `now`, first, so the exercise opens in it (A, then G and A), the others kept; `now`
    stays at most three, the oldest moving to `back`. The added key is the next key of the open stages in the track's
    order.
  - `position`: `now` becomes the next position; the old one goes first in `back`.
- "The version before": the `given` of the newest earlier row for this block that differs from the last one; with none,
  the first-play version.
- With no move in, a "move" outcome is "the same".

Every move adds one to `given.moved`; going back to the version before takes that version's `moved`.

Earned keys: a key is earned on a track once the player rated 4 or 5 a play that opened in it (`given.keys.now[0]`). Derived
from the progress log on each compose, not stored (call).

Tempo and position are remembered per block only; they never cross to other blocks (call).

Teachers' weeks (`composeWeek`) use the same roll, a block appearing twice in a week getting the same version (call).

## Ratings, steps, coverage

- A progress-log row (`ProgressEntry`) gains `given`: the values the exercise was played with. Still one row per slot.
- A block's steps, `find_blocks` by step and `library_coverage` stay per block: no move takes a block off its step
  (that is why level and scale don't move, and why a position step's block has no position move).
- The step's outcome: a row rated 1 or 2 whose `given.moved` is 1 or more is skipped by the readers that score a step
  or pace a level (`outcome()`, `solidRatedAt`, `raisedAnswers`), as if that play was not rated; the step stands on its
  other ratings. Every other reader sees the row as it is: the composer's `choose()` still brings a low-rated block back
  first (and the roll then mostly gives the version before), and /dev/progress lists it. Ratings of 3 and up count as
  today (call).
- "Get another plan" and `anotherDay` keep rated exercises with their `given`.

## Seeing it

- /dev/compose: per pick, the block's moves, the newest rated row (version and stars), the outcome table row used, the
  moves in with their weights, the roll, the `given` that came out. A made-up player can be given a rating history.
- /dev/path: each step shows its key stages and where the made-up player stands on them (open, earned), in the Path
  view itself; the Keys view stays for the area ladders.
- /dev/library?item=<id>: the block drawn in its first version and, by a small control, in each version its `moves`
  allow (every bpm step, each position, a second key), so text params and chips can be read drawn.

## Seed files, prompt, versions

- New rule for seed blocks (README "Writing rules", `exercise-example`, `teaching-voice` where it words selectors): a
  block states `moves`, has no `options` choice, names values by params, never a selector. The rules for
  `"label": "stage"` / `"variant"` choices and "names the selector" go.
- The showcases `stages` and `variants` are replaced by one showcase of `moves` (call).
- The plan prompt's format and interface (`tools.ts`, generated) gain `moves` and the params.
- This changes what gets written: raise the teaching version, `PROMPT_VERSION`, and AGENTS.md's if its text changes,
  each with a `CHANGELOG.md` entry, in the commit that changes the rule.
- `seed check`: for a file at the current versions, an `options` choice that sets key, bpm or position fails, and so
  does `moves` on a section; `moves` values must match the tools as
  written (`from` = the tools' bpm, first position = the tools' position); a param must have its move.

## Rollout

1. Model and reader: `moves`, `given`, `applyGiven`, params, the app's chip line, `rollVersion`, the log's `given`, the
   dev pages. The reader takes both shapes: a block with its own `options` choice is drawn as today (and an old Key
   selector keeps following the player's keys through `given.keys`), it just gets no rolled moves.
2. A first batch of six seed blocks rewritten to the new shape with `exercise-example`, one per case (call on the list):
   a pentatonic position drill (key), a run with a tempo ladder (bpm), a technique drill playable in two positions
   (position), a block whose selector sets key and tempo together today (key + bpm apart), a chord-shape block (key
   fixed, bpm moves), a voice block (key in the singer's keys). Read drawn on /dev/library, reviewed with
   `review-teaching-text`. The user reads these before step 3.
3. Agents rewrite the remaining seed blocks and plans to the batch's model, then reseed.
4. When no seed file has an `options` choice that sets key, bpm or position: those parts leave the `options` choice in
   the parser and the prompt, and `withKeys`' selector path goes.

## Left to the builder

- Names (`moves`, `given`, `applyGiven`, `rollVersion`) and file layout in `model/`.
- How `given` reaches the progress row (`progressLog.ts` `entryFor`) and the server's progress table column.
- The exact chip labels: use the labels on the screen today (Key, and what tempo and position selectors are called).
- Whether an old stored `keys` is read or dropped.
- Tests: the roll table by rng, each move's bounds, `applyGiven` against `applyChoice`, params in `noteText`, block id
  unchanged by `given` and changed by `moves`.
