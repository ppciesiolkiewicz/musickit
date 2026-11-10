---
name: review-teaching-text
description: Audit learner-facing music text in musickit - a course section, a stage, an exercise or plan example, glossary meanings - for wrong music facts, text that disagrees with its picture or tool, and breaks from the teaching voice. Reports findings, does not rewrite unless asked. Use when asked to review, check, proofread or audit lessons, articles, exercises or examples, and before finishing course-article or exercise-example work.
---

# Review teaching text

Find what is wrong, show the proof, and propose the smallest fix. Don't rewrite text that is fine.

## What to check, most serious first

1. **Wrong facts.** For every key, chord, note, scale, interval, position and fret, run `npm run -s theory -- …` and compare. Also check dots by hand: in course `neck` blocks, string 0 is low E, and `pcAt(string, fret)` gives the pitch class. A wrong fact is always a finding, however small.
2. **Text and picture disagree.**
   - A note the text names that isn't lit or drawn in the visual or tool after it.
   - A caption that describes something else.
   - The tempo or key in the text differs from the tool's `bpm` or `key`.
   - `highlight` lights a degree that isn't the note the text means (for example `b3` is C in A, not C♯).
   - Chords named in the text appear in no chord tool.
3. **Order of ideas.** The text uses a word or idea before the course or the exercise has explained it. Or it defines again something that an earlier section, or the glossary (in plan text), already explains.
4. **Rules.**
   - Exercises and examples: the `rules`, `mistakes` and `writing` parts of `src/features/plan/model/prompt.ts`, and `src/features/plan/examples/README.md`.
   - Course sections: `src/features/course/content.test.ts` and the course-article skill.
5. **Practice and understanding.** The page is reading with no drill. Or there's a drill with no why, or a why the learner couldn't use to make up their own. Or "done" is a count or a score instead of a feel.
6. **App words.** "Words about the app" in the **teaching-voice** skill. Open the tool's component and compare:
   - A control named differently from its label on the screen, or a game answer named differently from its button.
   - A bare "Press Play." that doesn't say what starts or where it is.
   - Two names for one thing on the screen (ringed and circled, the band and the backing for the same tool).
   - A heading that could sit on any block ("Warm-up", "Step 2").
7. **Voice.** The **teaching-voice** skill: repeat counts, poetic lines, a paragraph of why, more than two steps chained, a word used for two things.

Run the relevant tests too (`course/*.test.ts` or `plan/examples/*.test.ts` with the cached tsx, see the other skills). A failing test is a finding.

## Report

One line per finding, most serious first:

```
<file>:<line> [fact|mismatch|order|rule|app|voice] <what's wrong> → <fix>
  proof: <calculator output or the conflicting prop>
```

End with the count per kind. If nothing is wrong, say so in one line. Only edit files when the user asks you to fix the findings.
