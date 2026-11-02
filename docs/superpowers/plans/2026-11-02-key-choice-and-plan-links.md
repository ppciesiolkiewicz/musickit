# Key choice wrapper, and learnBefore in the plan examples: Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) One tool that wraps another and lets the student switch it between 2–3 keys, so "the same pattern in a new key" doesn't need a copy of the tool per key. (B) Every exercise in the six plan examples gets at least one `learnBefore`, so the example plan agrees with the prompt's new rule.

**Already done (2026-11-02):** the 9 exercise examples that had no `learnBefore` now have one, and `examples.test.ts` enforces it. The "second key" rule is in the examples README, the exercise-example skill and the prompt. It is met with repeated tools: do-mi-sol uses D, F and A staffs, and in-tune-over-drone, pick-step-tunes, matching-a-pitch and guide-tones each have a block in a second key.

## Global Constraints

- Tests: `$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1) --test src/features/plan/examples/*.test.ts src/features/plan/model/*.test.ts`, then `npx tsc --noEmit 2>&1 | grep -v '^.next/'` and `npx eslint src/features/plan src/features/exercises`.
- Prompt text about tools is generated from `COMPONENT_DOCS` (`npm run docs:exercises`), never hand-listed.
- Commit to `main` through a temp `GIT_INDEX_FILE`, never `git add` in the real index. Other sessions edit `prompt.ts`, so commit only your own hunks.

## Part A: `key-choice` wrapper

### Shape

```json
{ "type": "key-choice", "keys": ["d", "f", "a"],
  "tools": [ { "type": "staff", "scale": "major-ionian", "key": "d", "voice": "tenor", "notes": ["1","3","5"], "drone": true } ] }
```

- `keys`: 2–3 key slugs (`parseKeySlug`). The first one is the key the inner tools are written in, and they must agree with it.
- `tools`: 1–2 tools that play together (a staff plus a chord-backing, a scale-neck plus a backing-band). No nested `key-choice`.
- It renders a chip row ("D · F · A") above the inner tools. A chip moves every inner tool to that key, and the first chip starts selected.
- It counts as its inner tools toward the 6-tool cap.

### Transposing (pure, `model/transpose.ts`)

`transposeTool(tool: PlanTool, toPc: number): PlanTool`, one case per tool type:

| Tool | What moves |
|---|---|
| staff, scale-neck, position-neck, click-drone, backing-band, melody-singer | `key`; `add` pitch classes shift by the same step |
| chord-backing | `key`; `chords` names through chordKit (`parseChordQuery` root + suffix), spelled for the new key |
| strum-along, chord-shapes | `chords` names, as above |
| arpeggio-neck | `chord` name |
| guitar-play-along | `shape.key` (melody/progression shapes) |
| note-finder, interval-ears, run-singer | not allowed in a key-choice (no key) |

Degree marks (`enable`, `highlight`, `notes`, `{{1}}`) are relative to the key, so they need no change. Letter marks (`{{c-sharp}}`) in the text before a key-choice can't follow the key: the parser warns about them.

### Tasks

- [ ] **1. `transposeTool` + tests.** One test per row above, plus enharmonic spelling (F major spells B♭, not A♯) through the existing key-spelling helper. Check chord names against `npm run -s theory -- scale <key>`.
- [ ] **2. Parse.** Add `key-choice` to `TOOLS` in `model/tools.ts`: check `keys` (2–3, distinct, the first matches the inner tools' key), parse the inner tools with the existing parsers, and drop nested key-choices or keyless tools with a warning.
- [ ] **3. Component + doc.** `src/features/exercises/cues/KeyChoice.tsx` with an `@component` JSDoc and `key-choice.props.ts`, then `npm run docs:exercises`. Remount the inner tools on a switch (`key={pc}`) so audio and mic stop cleanly, and add it to `ui/ExerciseTool.tsx` and `/dev/stories`.
- [ ] **4. Range check.** For staff and melody-singer, a key that pushes the notes out of the voice's range (`VOICES` in `theory/singing.ts`, tenor 48–72) is a parse warning. Test it with a bass voice and A.
- [ ] **5. Prompt.** In the tools part, change "the student gets no settings to change" to allow the key-choice chips as the one exception. Then make the second-key rule say: "a key-choice with 2–3 keys, or a second tool in a later block".
- [ ] **6. Examples.** In do-mi-sol, block 1 becomes one key-choice (D, F, A) in place of three staffs, which brings the tool count from 6 down to 4. Leave the other four examples as they are: their second key is a later block, and that is a real change of block. Update their `note`.
- [ ] **7. Check in the app.** Paste do-mi-sol into `/plan`. Switch the chips while the drone runs: the drone stops, the staff redraws in F, and Start plays F.

### Open questions for the user

1. Chips the student taps, or should the key move on by itself each block or minute? The plan assumes chips.
2. Should the chips show only the key ("F"), or the key and Do ("F · Do = F")?

## Part B: `learnBefore` for the plan examples

160 exercises in the 6 plans have none today. The AI copies the example plan, so they contradict the new rule until they are filled in.

Draft content: `2026-11-02-plan-learn-before.json` (next to this file), with `planId → "day.exercise" → { title, learnBefore }`. It was drafted from the exercise titles and checked: all 210 hrefs pass `checkLink` against the catalogue. It still needs a person's read. Weak spots to check:

- guitar-theory-intermediate "Arpeggios of the ii-V-I" / "Arpeggios in G" → `/course/5/arpeggios`; `/course/7/sevenths` may fit better.
- voice "Over G and D", "Over F, B♭ and C", "A tune under Do, then over three chords" → `/course/6/harmony-line` + `/course/9/improvising-a-melody` (both planned stubs).
- guitar "Alternate picking" / "Picking across strings" → `/course/1/spider` (no picking article yet; maybe add a stub).

### Tasks

- [ ] **8.** Apply the JSON: insert `"learnBefore"` after each exercise's `why` (or `focus` if there is no `why`), keeping the hand formatting. The script used for the exercise examples did this with a regex insert.
- [ ] **9.** Change the test "every exercise example has a lesson to learn before" so it covers the plan exercises too (the `exercises` list in `examples.test.ts`). Drop "Exercise examples" from the README rule.
- [ ] **10.** Run the tests and paste one plan into `/plan`. Each card's "Learn before" names a real lesson.
