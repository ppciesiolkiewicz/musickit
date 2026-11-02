---
name: teaching-voice
description: How musickit teaching text sounds - plain, short, practical English for course articles, exercise text, glossary meanings, about lines and captions. Use whenever writing or editing any learner-facing music text in this repo, alone or from the course-article, exercise-example and review-teaching-text skills.
---

# Teaching voice

The learner reads this text with a guitar in hand or the mic on. Each sentence either says what something is, or what to do next.

## What we teach for: practice and understanding

This is the landing page's promise (`src/app/page.tsx`): "It's not a game. It's practice." Every lesson and exercise keeps it.

- **Practice is the point.** Every page ends in something to play, sing or hear now. Reading is the shortest part.
- **Repeat until it's automatic, not until a count.** Say what "got it" feels like: "until your fingers move without thinking", "until you can name it the moment you hear it". Don't use repeat counts, scores or "done when". There are no points and no screen that says you got it right.
- **Understand why it works.** Give the one sentence of why that lets the learner build their own drill: what the drill trains, and why this shape or note does it. ("From Em to C only one note moves, so the change is one finger.") Don't give rationale for its own sake.
- **Make it your own.** Where it fits, end with the variation that turns a drill into a new one: change the key, the position, the rhythm or the string set ("Now start from the A string: same shape, new drill.").
- **Name the sense it builds:** hands (finding the note), ears (hearing it), voice (singing it), timing (feeling the beat). A drill can say which one it's for in plain words.
- **Progress you can feel.** Point the learner at what they will notice getting easier, not at a score.

Don't use the landing page's marketing voice in lessons: no "you'll soon be…", no selling. Use the same idea, said plainly.

## Facts first, from the calculator

Never work out a music fact by hand: chords of a key, notes of a scale, which box or position, frets, which keys fit a progression. Run the theory calculator and copy its answer:

```
npm run -s theory -- help
npm run -s theory -- scale D dorian
npm run -s theory -- box A minor C
npm run -s theory -- fit Am F C G
```

It uses the same chordKit code the app draws with, so the text and the picture agree. If the calculator can't answer it, say so to the user. Don't guess.

## Sentences

- Plain, natural English. Short sentences. Two steps that belong together share one sentence ("Find it on the A string, then on the B string, and hop between the two."). Never chain more than two steps. Never write a string of two-word orders.
- Say exactly what to do: "play {{6}}, then {{1}}", not "resolve it to Do". A target says when: "land on C when Cm7 comes round".
- One sentence of why, at most, before the doing. No paragraphs of rationale. No "a-ha" moments for the learner to discover.
- No poetic lines ("Re rubs against it"). No hype ("amazing", "powerful", "unlock"). No hedging ("you might want to").
- No repeat counts ("five times", "ten clean runs"). The timer or the learner decides when to stop. "Keep going until it feels easy" is fine.
- Invite the learner: try, mix, make up, guess and check. Don't lecture.
- No jargon the text hasn't explained. No numbers out of nowhere ("not seven").

## Words

- Use one word for one thing:
  - Scale shapes on the neck: exercise text says "position" ("position 1", "the position with the root on the A string"), never "box" or "pattern", even though some props are called `boxes`. Course stage 8 still says "CAGED box" and "pentatonic boxes". In an article, follow the stage you are writing in, and never mix the two words on one page.
  - "the staff" for the five-line notation. Never "stave" or "music sheet". Never call a neck, chord box or tab a staff.
  - "the metronome" for the click. "one note per beat" for a step.
- Use note symbols: ♯ ♭ (C♯, B♭). Use "3rd", "5th", "♭7" in prose (exercise JSON writes degrees as `{{b7}}`). In chord names, write the chord the way the app does (Am7, G7, Cmaj7).
- Solfège is Do Re Mi Fa Sol La Ti, capitalised. Do is always the home note.
- Put guitar fingers with frets: "play frets 1 to 4 with fingers 1, 2, 3 and 4", never "play fingers 1 2 3 4".
- Explained words: `GLOSSARY` in `src/features/course/glossary.ts`. In AI plan text the app adds an (i) to these words, so use the word and don't define it there. Course articles get no (i), so an article defines a word the first time the course uses it, or links to the section that does.

## Picture and text agree

Whenever the text has to carry something a picture could show (frets, note lists, fingerings), the picture is missing. Add a visual or a tool, and cut the text down to one sentence about it. Every note the text names is on the picture after it, and it stands out there.

## Before you hand it over

Read the text aloud in your head as a learner who knows only the earlier sections. Cut every sentence that adds nothing. Check every fact against the calculator output.
