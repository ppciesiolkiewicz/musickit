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
their answers. Then voice type and range (if they sing), minutes a day, and anything else.

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
