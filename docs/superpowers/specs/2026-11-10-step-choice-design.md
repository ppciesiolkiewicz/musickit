# Step choice: stages and variants of one step (design)

Status: waiting for approval. Nothing is built.

## Why

An exercise often wants the same drill several times with one thing changed: faster, in another key, in another
position. Today that means a copy of the tool per version (which eats the 6-tool cap) or the `key-choice` tool, which
only knows keys. We want one chooser that can change more than the key, and that can be shown as "Stage 1, Stage 2,
Stage 3" or "Variant 1, Variant 2".

Two ways a teacher thinks about it, both wanted (the user's words):

- **Stages**: a ladder. The same drill, a step harder each time, most often faster.
- **Variants**: the same idea in different places, so the player tries them and finds the connection between them.

The AI that writes the plan picks the word.

## Goals

- One tool, `step-choice`, replaces `key-choice`. `key-choice` is no longer a tool the prompt offers or the app stores.
- One chooser sets several things at once (its **parts**): a chip is a bundle, such as "80 bpm in A".
- Chips can be numbered and named "Stage" or "Variant", each saying what it changes.
- The AI plan prompt explains the tool, when to use stages and when variants, and how to point at the chips in text.
- Old plans and pasted replies that hold `key-choice` (or the older `keys` on a heading) still work.

## Non-goals

- No timer or automatic move to the next stage. The player taps.
- No independent rows (a Key row and a Tempo row picked apart). One chooser per step, one row of chips.
- No change to the text of a step when a chip is picked. A stage that needs new words is a new heading, as today.
- `notes` as a part (see "Later").

## Anti-goals

- A chooser that leaves the step's tools disagreeing (a staff click at 60 and a band at 80).
- Chips the player taps blind: a numbered chip always shows what it sets.
- Tools learning about the chooser. They keep receiving plain props.

## What the player sees

A row of chips on top of the tool it moves, where `key-choice` sits today.

- **Named** (`label` is `"stage"` or `"variant"`): chips read "Stage 1", "Stage 2", … with a small second line listing
  what that chip sets, parts joined by " · " in the order key, tempo, position: "A · 80 bpm · Position 2".
- **Plain** (no `label`, allowed only when the options set one part): the row is named after the part and the chips
  show the value, as today: "Key  G  A  C", "Tempo  60  80  100", "Position  1  2".

The first chip is picked at the start. Picking a chip moves every tool in the step (heading to heading) and restarts
them, so whatever was playing stops. The `{{3}}` dots in the step's text follow, as they do now.

## The tool

```json
{ "type": "step-choice", "label": "stage",
  "options": [ { "bpm": 60 }, { "bpm": 80 }, { "bpm": 100 } ] }

{ "type": "step-choice", "label": "variant",
  "options": [ { "key": "g", "position": 1 }, { "key": "c", "position": 4 } ] }

{ "type": "step-choice", "options": [ { "key": "g" }, { "key": "a" } ] }
```

- `options`: 2 to 4. Each holds the same parts (a part is in every option or in none); options must differ.
- `label`: `"stage"`, `"variant"`, or left out. Left out with more than one part: treated as `"variant"`, with a paste warning.
- The step's tools are written as option 1. Option 1 must agree with them (paste warning when not, as `keyWarnings` does today).
- One per step; the first one counts. It does not count toward the 6-tool cap.

### Parts in the first build

| Part | Value | What it does to the step's tools |
| --- | --- | --- |
| `key` | a key slug | moves every tool by (option key − option 1 key), exactly as `transposeTool` does today |
| `bpm` | 30-240 | sets `bpm` on every tool that has one (a staff only when its `click` is on; a backing-track gets it set, clamped to its own range) |
| `position` | 1-5 | sets a `scale-neck`'s `boxes` and a `position-neck`'s `positions` to that one position |

A part that no tool in the step can follow is a paste warning ("… has a step-choice with bpm, but no tool with a tempo").
For `key` the existing rule stays: every other tool in the step must be able to change key.

### Later (not in this build)

- `notes`: needs a different prop per tool (`notes` on a staff, `enable` / `highlight` on necks).
- `without`: a stage that takes support away (drone off, labels hidden).

The model should make adding a part one entry: its parse, its chip text, its `apply(tool, value, first)`.

## How it is built

- **Model** (`src/features/plan/model/transpose.ts`, renamed or joined by `stepChoice.ts`): a `PARTS` table, one entry per
  part. `applyOption(sections, options, index)` replaces `transposeStep`; `choiceWarnings` replaces `keyWarnings`.
  `transposeTool` stays as the `key` part's apply.
- **Parse** (`model/tools.ts`): `step-choice` in `TOOLS`; everything dropped or defaulted is a warning, like every other tool.
- **Old data** (`model/migrate.ts`, `liftHeadingKeys`): `{ "type": "key-choice", "keys": [a, b] }` reads as
  `{ "type": "step-choice", "options": [{ "key": a }, { "key": b }] }`, pasted and stored alike, without a warning for
  stored plans. A heading's old `keys` lift to the new tool.
- **View** (`src/features/exercises/basics/step-choice/`, replacing `basics/key-choice/`): one component with the two
  looks above; `@component` doc and props file, then `npm run docs:exercises`.
- **Step state** (`plan/ui/Sections.tsx`): the picked option index per step in place of the picked key.
- **By-name special cases** move from `"key-choice"` to `"step-choice"`: `ui/Tool.tsx`, the tool count in `config.ts`,
  `prompt.ts` (the week report's keys and bpm should list every option's), the tour in `guide/toolTours.ts`, the story in
  `devtools/stories`.

## The prompt

Generated from `COMPONENT_DOCS` as now, plus the hand-written lines that name `key-choice` today (`prompt.ts` 212, 216, 286):

- "The same drill again with one thing changed (faster, another key, another position): step-choice, right before the tool it moves."
- When to use which word: **stage** when each option is harder than the last and the player should get one right
  before moving on (tempo ladders); **variant** when the options are equals to compare (keys, positions) and the text
  asks what stays the same between them. Plain key chips for the old second-key rule.
- The student has no settings to change "apart from a step-choice's chips".
- Point at a chip by its words on the screen: "tap Stage 2 above the neck", "tap A in the Key row above the staff".
- Text in a step with stages must not name one tempo or key as if it were fixed; say what stays the same.

## Examples, skills, versions

- The 7 example files that use `key-choice` (10 uses) move to `step-choice` in plain key form, so their text ("the Key row") stays true.
- One new showcase example for stages (a tempo ladder) and one existing example reworked to variants, written with the
  `exercise-example` skill, since the AI copies examples more than rules.
- `exercise-example` and `plan/examples/README.md` rules change from `key-choice` to `step-choice`, with the stage / variant guidance.
  That is a rule change, so the teaching skills' shared version and `DOC_VERSIONS` go from 1 to 2 in the same commit.
- Interface words ("Stage", "Variant", "Tempo", "Position", the tour step) are written with `design:ux-copy` and "Words about the app".

## Checks

- Model tests: each part's apply, option 1 agreement, mixed parts, old `key-choice` and heading `keys` reading as the new tool.
- Feature tests, `tsc`, eslint on changed files.
- On screen: `/dev/stories` (three stories: plain keys, stages, variants) and `/dev/examples`; pick chips while a band plays.

## Calls made by the writer, not the user

- The tool's name, `step-choice`, and the `options` list (a chip per entry) over a `parts` map of lists.
- `position` joins `key` and `bpm` in the first build; `notes` and `without` wait.
- 2-4 options (keys were 2-3).
- Plain chips survive for a single part, so today's "Key  G  A" look and example text stay.
- The teaching version goes to 2.
