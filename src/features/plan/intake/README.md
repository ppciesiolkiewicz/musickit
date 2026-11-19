# Plan intake

The first questionnaire of the practice plan. Its one job is the **cold start**: telling the AI enough to get week 1
roughly right. From week 2 on, the stars the student gives each exercise (`src/features/progress`) and the AI's own
progress summary count for more, and this questionnaire is not shown again unless the student asks.

Spec: `docs/superpowers/specs/2026-11-10-plan-topics-progress-design.md`.

## What it asks

Which areas the student plays (guitar, voice, theory & ear), then six **topics** per area. Each topic has four lines,
from "Not yet" to solid, and the student taps the one that sounds like them (a `Rung`, 0 to 3). A topic may be left
unanswered. The topics come one at a time in a panel whose four lines never move (`ui/TopicStep.tsx`), so a student
who knows their level taps the same spot without moving the pointer; the area's topics are listed under it with
their answers. Then the voice (if they sing), minutes a day, the keys, and anything else.

The keys question is one question for every area: how many keys they are at home in, from "One key" to "Any key" (`PlanAnswers.keys`, 0 to 4), or Not sure. Each answer is one card, all of it the button, with a short list of example keys, the same for every area (`KEY_EXAMPLES`): C, G, D, E, A and F for "One key" and "Two or three keys", B♭ and E♭ added for "The common keys", A♭ and B for "Most keys", "All 12" for "Any key". The plan still starts "One key" in the ladder's first key. The answer is a rung of each area's key ladder (`KEY_LADDERS` in `../model/keys.ts`: guitar starts in A, voice and theory in C), and the screen says under the lines which keys that is in each chosen area. With no answer each area's level decides (`keyRung`): a new player and a beginner have the first key only, an intermediate one adds the second rung, an advanced one the third; the last two rungs come only from the answer. The composer gives every exercise with a Key selector those keys, and the earlier ones to go back to.

The voice screen (`ui/YourVoice.tsx`) offers the range finder first (`ui/RangeFinder.tsx`: the player slides down to their lowest easy note, then up to their highest; each step keeps the furthest note held for half a second, vibrato of up to a semitone each way included (`steadyNote`), and ends when they press its button; a bar under the note heard fills as they hold it, and a note that counts pops in the text and ripples on the chart), then the voice types. A player's voice is theirs on every page, so the screen changes it at once (`usePlayerVoice`, their `user_voices` row) and keeps a copy in the answers. It is one or the other: a range of their own, which the singing tools then use and name whole ("A2 to E4"; under an octave it is widened to one, `rangeOf`), or a type, whose range is its definition (`VOICES`).

A teacher answers the same screens for a student on the Students page (`questionSteps(draft, set, { forStudent: true })`,
`src/features/students`): every line that says "you" says "your student", the answer options keep their own words, the
voice screen has no range finder (it listens to whoever is at the microphone; the type picked becomes the student's voice when they are added), and each topic screen needs one answer,
since an area with none can't make the student's first week.

The plan's fine concepts (`../model/concepts.ts`, 67 today) are not asked about. Each belongs to one topic (`Concept.topic`), and
the AI tags exercises with them.

## Files

```
topics.ts     TOPICS (18, six per area), topicById(), topicsFor(area); Rung
answers.ts    PlanAnswers, DEFAULT_ANSWERS, MINUTES, migrateAnswers(), levelOf(), areasMissingTopics()
placement.ts  placement(topics): the step each track of an answered topic starts on (NEW9)
ui/           the questionnaire screens as step-modal steps
```

`/dev/questionnaire` shows what the answers do.

## Rule

This folder imports nothing from the plan's prompt, store or week view. It may import types from `../model/concepts`
and `../model/types`. The rest of the plan feature imports from here.

## Where an answer places a player

`placement.ts` (NEW9): the line picked for a topic is a level (0 "Not yet" is new, 3 advanced), and every track of the
topic (`model/path.ts`) starts at its first step of that level; the steps under it are taken as known. A track whose
steps all sit lower is "done", and one whose first step is higher is "ahead", starting at that step. `/dev/questionnaire`
shows it under "Concepts", as each step known, within reach, open or ahead (`model/reach.ts`), with "start" on the starting step. Nothing else reads it yet: the plan writer gets it with NEW7.
