# Plan intake

The first questionnaire of the practice plan. Its one job is the **cold start**: telling the AI enough to get week 1
roughly right. From week 2 on, the stars the student gives each exercise (`src/features/progress`) and the AI's own
progress summary count for more, and this questionnaire is not shown again unless the student asks.

Spec: `docs/superpowers/specs/2026-11-10-plan-topics-progress-design.md`.

## What it asks

Which areas the student plays (guitar, voice, theory & ear), then six **topics** per area. Each topic has four lines,
from "Not yet" to solid, and the student taps the one that sounds like them (a `Rung`, 0 to 3). A topic may be left
unanswered. Then voice type and range (if they sing), minutes a day, and anything else.

The plan's 70 fine concepts (`../model/concepts.ts`) are not asked about. Each belongs to one topic (`Concept.topic`), and
the AI tags exercises with them.

## Files

```
topics.ts     TOPICS (18, six per area), topicById(), topicsFor(area); Rung
answers.ts    PlanAnswers, DEFAULT_ANSWERS, MINUTES, migrateAnswers(), levelOf(), areasMissingTopics()
ui/           the questionnaire screens as step-modal steps
```

## Rule

This folder imports nothing from the plan's prompt, store or week view. It may import types from `../model/concepts`
and `../model/types`. The rest of the plan feature imports from here.
