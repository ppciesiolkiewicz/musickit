---
name: teaching-voice
version: 5
description: How musickit teaching text sounds - plain, short, practical English for course articles, exercise text, glossary meanings, about lines and captions. Use whenever writing or editing any learner-facing music text in this repo, alone or from the course-article, exercise-example and review-teaching-text skills. Its "Words about the app" section is also the house wording for interface copy (buttons, tour steps, notices, flow text), read alongside design:ux-copy.
---

# Teaching voice

The learner reads this text with a guitar in hand or the mic on. Each sentence either says what something is, or what to do next.

The sections, in the order to use them: what the text is for, where its facts come from, how its sentences and words go, how it names the app, and the last read before you hand it over. Writing interface copy with no music in it (a button, a notice, a tour step)? "Words about the app" and "Sentences" are the parts that apply.

## What we teach for: practice and understanding

This is the landing page's promise (`src/app/page.tsx`): "It's not a game. It's practice." Every lesson and exercise keeps it.

- **Practice is the point.** Every page ends in something to play, sing or hear now. Reading is the shortest part.
- **Repeat until it's automatic, not until a count.** Say loosely what "got it" feels like: "play until it feels comfortable", "try it at least a few times", "until your fingers move without thinking". Don't use exact counts ("five times", "ten clean runs"), scores or "done when", and don't get technical about it. The timer or the learner decides when to stop. There are no points and no screen that says you got it right.
- **Understand why it works.** Where it helps, give the one sentence of why (it is never required) that lets the learner build their own drill: what the drill trains, and why this shape or note does it. ("From Em to C only one note moves, so the change is one finger.") Don't give rationale for its own sake.
- **Make it your own.** Sometimes, not every time, end with the variation that turns a drill into a new one: change the key, the position, the rhythm or the string set ("Now start from the A string: same shape, new drill."), or let the learner pick their own notes ("Now pick another set of notes from the position and make up your own line.") with the whole position shown, every note enabled.
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
- **No shorthand the learner must unpack.** What to sing on gets its own clause with its own verb: "Sing along on the note names.", "then sing it on \"la\"" — never hung inside another instruction ("Make up a tune from {{1}}, {{2}} and {{3}} on \"la\""). The moment to move on is the feel itself, spelled out: "once the names come without thinking", never "once you know it".
- One sentence of why, at most, before the doing. No paragraphs of rationale. No "a-ha" moments for the learner to discover.
- No poetic lines ("Re rubs against it"). No hype ("amazing", "powerful", "unlock"). No hedging ("you might want to").
- Invite the learner: try, mix, make up, guess and check. Don't lecture.
- **What to do and what to notice sit on separate lines.** A line break in a text (`\n` in the JSON) starts a new line on the screen. Use one between the doing, the next thing to try, and what to notice or do when it goes wrong. The noticing line starts with what the learner just changed: "When you change the key, the chords are new but the numbers sound the same."
- **Say what stays the same in this drill, never a stock line.** Not "The notes change, the pattern doesn't." on every exercise, but the thing itself: "the slide on the G string is still {{4}} to {{5}}", "the drop is still an octave", "the tune keeps its shape".
- No jargon the text hasn't explained. No numbers out of nowhere ("not seven").

## Words

- Use one word for one thing:
  - Scale shapes on the neck are "positions" everywhere: articles, exercises, titles, headings and captions ("position 1", "the position with the root on the A string"). Never call them "box" or "pattern", even though some props are called `boxes` and the theory calculator says "box". The one place "box" may appear is the explained word's meaning (the `position` entry in `GLOSSARY`), so a learner who meets "box" elsewhere knows it's the same thing. When you touch text that still says "box" for a scale shape, change it to "position"; course stages 6, 8, 9 and 10 still have some (`grep -n -i 'box' src/features/course/stages/*.ts`). A slug stays as it is (`pentatonic-boxes`), since links point at it. "Chord box" is a different thing and stays.
  - "the staff" for the five-line notation. Never "stave" or "music sheet". Never call a neck, chord box or tab a staff. Don't explain what it is, except the first time for a new or beginner learner ("the staff, the five lines of music, where your pitch shows as a line").
  - "the metronome" for the click. "one note per beat" for a step.
  - The thing a drill practises gets one word, the same in every step and heading of the exercise: "the crossing" for the way from one position to the next (not "the way across" in one step and "the slide" in the next), "the tune", "the run". Where it is a word a learner may not know, add it to `GLOSSARY` so the app explains it.
- Use note symbols: ♯ ♭ (C♯, B♭). Use "3rd", "5th", "♭7" in prose (exercise JSON writes degrees as `{{b7}}`). In chord names, write the chord the way the app does (Am7, G7, Cmaj7).
- Solfège is Do Re Mi Fa Sol La Ti, capitalised. Do is always the home note.
- Put guitar fingers with frets: "play frets 1 to 4 with fingers 1, 2, 3 and 4", never "play fingers 1 2 3 4".
- A singing step says what to sing on, in these exact words, which the app explains with an (i): "on the note names" while learning the notes, else a sound ("on \"ah\"", "on \"oo\"", "on \"ee\"", "on \"la\""). Don't explain the phrase in the text. For a beginner, and for any high note, pick "oo", "ee" or a hum; keep "ah" for low and middle notes.
- **The underlined line.** A line written between underscores (`_Don't reach for high notes: sing only where your voice feels easy._`) is drawn over a low band of colour in exercise and plan text. It is for care only: a line that keeps the learner from hurting their voice or hands (reaching for high notes, pushing for volume, playing through pain). Never use it to stress an ordinary instruction, a note, a control or a title. One whole short sentence, on a line of its own, said as what to do; at most one in an exercise, and not in every exercise. For a new or beginner singer it goes where they could wander up the staff: the first staff of a week, a slide, a tune they make up, a skip up to Sol. The words "reach for high notes" are an explained word (the app adds the (i) and the link to the lesson), so write those exact words and vary the rest.
- Explained words: `GLOSSARY` in `src/features/course/glossary.ts`. In AI plan text the app adds an (i) to these words, so use the word and don't define it there. Course articles get no (i), so an article defines a word the first time the course uses it, or links to the section that does.

## Words about the app

A step is also interface copy: the learner has to find a control with one hand on the guitar. Write it so they never hunt.

- **Name a control by the label on the screen, exactly**: Play, Start, Next, Skip, Start exercise, Start microphone, "Cross on". Read the label in the component (`src/features/exercises/basics/<tool>/index.tsx`, `src/components/practice/`); don't guess it. A game's answers are named as its buttons show them ("pick M3 or m3", "Major 7"), with the plain meaning beside them the first time ("M3 for a major 3rd").
- **Verb, label, where, what it starts**, in that order: "Press Play below to start the metronome." Never a bare "Press Play." Where is one word, "below" or "above"; add whose control it is only when the step has two of them ("Press Play on the first tab below", "under the neck").
- **One control per sentence.** "Press a chord box below to see the new shapes. Then press Play under them to start the metronome.", not both in one sentence. A tune or a run starts the mic with its Play, so it is one control: "Press Play below to hear the tune: the mic starts with it."
- **One verb per kind of control.** Press a button or a chord box. Tap a note on a staff or a neck. Use a selector. Play and sing are for the instrument and the voice, never for the screen.
- **The selector: invite, don't operate.** The row of chips a section's choice draws is "the selector", named by the label it shows: "the Key selector", "the Tempo selector", "the Position selector", "the Stage selector", "the Variant selector". The text says what to try and never which chip to tap, and never lists the options:
  - The reason to move on comes first, as a feel: "Once you can hum it before you play it, try it in another key."
  - Then the selector, in its own sentence, with what Play starts again after the change: "Use the Key selector below to change the key, then press Play to hear the tune there."
  - Then, on a new line, what changes and what stays: "When you change the key, the notes change but the tune keeps its shape."
  - The text that names a selector sits above it, so the selector is always "below".
  - Wrong: "Tap G in the Key row above the neck below, play the crossing there, then tap C." Right: "Play the same crossing in other keys. Use the Key selector below to change the key."
- **Say what they will see next**, when it isn't obvious: "After a bar of count-in, the lit box shows the chord to play."
- **Say what to do when it goes wrong**, inside the step, calmly and as an action: "If a change comes late, keep your strumming hand going and catch the next beat 1." No blame, no "don't worry", no "try again".
- **One name for each thing on the screen**, the same in every step:
  - "ringed" for a highlighted note, "faded" for a muted one, "lit" for the box or note playing now.
  - "the metronome" (a click), "the drone", "the band" (drums and bass, or a backing-track), "the backing" (a guitar-play-along), "the game" (note-finder, interval-ears).
  - "your line" for the singer's pitch on the staff, "the chord boxes" for chord diagrams.
- **Name who does it, never a bare "it".** When the one acting is not the learner (an AI extension, the metronome, the game, the band), name it in that sentence: "The AI extension reads this page and pastes your plan into the reply box", not "It reads this page". Use the same name in every step, card and button of one flow: "AI extension" throughout, never "the extension" in one step and "the AI in your browser" in the next.
- **Titles and headings are labels, not sentences.** A title names what is practised in the learner's words ("Em to Am, clean and in time"). A block heading names that block's task in five words or fewer ("Only the roots", "A new order"): never "Step 1", "Warm-up" or "Exercise". If two headings in one exercise could swap places, they say too little.
- **Say what to listen for, not how it sounds.** "Listen for the bar where one note changes" tells the learner what to do; "hear how bright it sounds" tells them what to feel.

## Picture and text agree

Whenever the text has to carry something a picture could show (frets, note lists, fingerings), the picture is missing. Add a visual or a tool, and cut the text down to one sentence about it. Every note the text names is on the picture after it, and it stands out there.

## Before you hand it over

Read the text aloud in your head as a learner who knows only the earlier sections. Cut every sentence that adds nothing. Check every fact against the calculator output.

Then read it once more, one question per pass:

1. **Could I do this step with my hands full?** Each step names the control, where it is and what it starts, one control to a sentence; a selector is named, its chips are not.
2. **Could I make up the next drill from the why?** If the why only says the drill is important ("the base every skill stands on"), it isn't one. Say what makes it work ("when your note matches the drone, the two blend into one sound").
3. **Do I know when to move on?** Somewhere in each block there is a feel to reach, not a count.
4. **Is anything said twice?** A fret, a fingering or a note list the picture already shows goes.

## When you change a rule here

The four teaching skills share one `version:` (in each one's frontmatter), and every example records the version it was written to. A changed rule is a new version: raise `version:` by one in all four skills and `teaching` in `DOC_VERSIONS` (`src/features/plan/examples/index.ts`) in the same commit. A typo, a path or a clearer sentence for the same rule is not a new version. "Version" in `AGENTS.md` has the whole rule.

The same voice is written down in four more places, each for a different reader. A rule changed in one is changed in all of them, in the same commit:

- `src/features/plan/model/prompt.ts`, the `writing` part: what the AI that writes plans is told. Run `src/features/plan/model/*.test.ts` after.
- `src/features/plan/examples/README.md` and its `CLAUDE.md`: the rules every example meets.
- `src/features/plan/CLAUDE.md`: the plan flow's copy.
- The `course-article`, `exercise-example` and `review-teaching-text` skills, where they repeat it.
