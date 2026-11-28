---
name: review-teaching-text
version: 17
description: Audit learner-facing music text in musickit - a course section, a stage, a seed exercise or plan, glossary meanings - for wrong music facts, text that disagrees with its picture or tool, and breaks from the teaching voice. Reports findings, does not rewrite unless asked. Use when asked to review, check, proofread or audit lessons, articles, exercises or examples, and before finishing course-article or exercise-example work.
---

# Review teaching text

Find what is wrong, show the proof, and propose the smallest fix. Don't rewrite text that is fine.

This skill is for text that teaches music. Interface copy with no music in it (a button, a notice, an error) is checked with `design:ux-copy` and check 6 below.

## What to check, most serious first

1. **Wrong facts.** For every key, chord, note, scale, interval, position and fret, run `npm run -s theory -- …` and compare. Also check dots by hand: in course `neck` blocks, string 0 is low E, and `pcAt(string, fret)` in `src/features/course/model.ts` gives the pitch class. A wrong fact is always a finding, however small.
2. **Text and picture disagree.**
   - A note the text names that isn't lit or drawn in the visual or tool after it.
   - A caption that describes something else.
   - The tempo or key in the text differs from the tool's `bpm` or `key`.
   - `highlight` lights a degree that isn't the note the text means (for example `b3` is C in A, not C♯).
   - Chords named in the text appear in no chord tool.
3. **Order of ideas.** The text uses a word or idea before the course or the exercise has explained it. Or it defines again something that an earlier section, or the glossary (in plan text), already explains.
4. **Rules.**
   - Seed exercises and plans: the `rules`, `mistakes` and `writing` parts of `src/features/plan/model/prompt.ts`, and `src/features/library/seed/README.md` ("Writing rules").
   - Seed exercises: an exercise that names another day or week in its title, headings, text or why ("day 2", "yesterday", "this week"). The app hands a block out alone, so it must read on any day.
   - Course sections: `src/features/course/content.test.ts` and the course-article skill.
   - /learn articles and course sections written in their style: the **article-voice** skill for the prose; their exercises are held to teaching-voice like a seed exercise.
5. **Practice and understanding.** The page is reading with no drill. Or there's a drill with no why, or a why the learner couldn't use to make up their own. Or "done" is a count or a score instead of a feel.
6. **App words.** "Words about the app" in the **teaching-voice** skill. Open the tool's component and compare:
   - A control named differently from its label on the screen, or a game answer named differently from its button.
   - A bare "Press the Play button." that doesn't say what starts or where it is, or two controls in one sentence.
   - A step that says which chip to tap or lists a selector's options ("tap G in the Key row", "tap Stage 2"), or names a selector that sits above the text.
   - In a block file with several choices: read every choice drawn (its `set` and `params` applied, `/admin/content/library?item=<id>`): each must read true against its own tools, a param must fit every sentence it sits in, and a choice whose words differ by more than a phrase or two belongs in its own block.
   - In an exercise with `moves`: a selector mentioned at all, a choice that sets a key or a tempo, or a key or tempo written as a value in the title, a heading or the text where `{{=key}}` or `{{=bpm}}` belongs.
   - In an exercise with `moves`: a line about another key or tempo with no `{{?key}}` or `{{?bpm}}` opening it, or a sentence explaining why the tempo is slow (the app writes it at 50 bpm or under).
   - Two names for one thing on the screen (ringed and circled, "the band" or "the backing" for the backing track).
   - A heading that could sit on any block ("Warm-up", "Step 2").
7. **Voice.** The **teaching-voice** skill: repeat counts, poetic lines, hype, a paragraph of why, more than two steps chained, a word used for two things, the stock line "The notes change, the pattern doesn't." where the drill's own thing should be named, "Stay with it until" or "Keep going until" where "Practice until" or the goal belongs, the staff explained ("the five lines of music"), a chord by its bare number ("the 1 chord", "the 1, 4 and 5") or counted with no long form the first time, a chord letter where a `{{chord:…}}` token belongs, a tune with no stages (with the tune, Tune off, a cappella) or "a cappella" over chords, a beginner's sung tune or backing track above 65 bpm, text about a row the tool isn't set to show, what to notice run into the sentence of what to do, "box" or "pattern" for a scale position, a mental shortcut left unspelled the first time ("play position 1", "the pentatonic", "up and down" with no start or turn), a bare position number ("position 1") with no scale named or as the name of the one position on the screen, a singing step that doesn't say what to sing on or hangs the sound inside another instruction instead of its own "sing it on" clause, a vague "once you know it" where the feel to reach should be spelled out, an underlined line (`_…_`) that is not a care line (don't reach for high notes, don't push, stop when it hurts) or more than one of them in an exercise.

Run the relevant tests too. A failing test is a finding.

```
TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)
$TSX --test src/features/course/*.test.ts
$TSX --test src/features/library/seed/*.test.ts src/features/plan/model/*.test.ts
npm run -s seed -- check <file>   # for a seed plan or block
```

## Report

One line per finding, most serious first:

```
<file>:<line> [fact|mismatch|order|rule|practice|app|voice] <what's wrong> → <fix>
  proof: <calculator output, the conflicting prop, or the label in the component>
```

The seven kinds are the seven checks above, in the same order. The fix is the new wording itself, not advice ("→ 'Press the Play button below to start the metronome.'", not "→ say what starts").

End with the count per kind, and one line on what you could not check (a page the dev server wouldn't draw, a fact the calculator can't answer). If nothing is wrong, say so in one line. Only edit files when the user asks you to fix the findings.
