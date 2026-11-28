---
name: teaching-voice
version: 17
description: How musickit plan and block text sounds - plain, short, practical English for seed exercises and plans, the AI plan prompt's writing rules, glossary meanings, about lines and captions, and the exercises inside articles. Use whenever writing or editing that text, alone or from the exercise-example, course-article and review-teaching-text skills; the prose of a /learn article or a course section is article-voice, which loads this first. Its "Words about the app" section is also the house wording for interface copy (buttons, tour steps, notices, flow text), read alongside design:ux-copy.
---

# Teaching voice

The learner reads this text with a guitar in hand or the mic on. Each sentence either says what something is, or what to do next.

musickit has two voices. This is the first, the plan and block voice: seed exercises and plans, the AI plan prompt, glossary meanings, about lines, captions, and every exercise (title, lines, between, after) inside an article. The second, **article-voice**, is the voice of the pages read through: the /learn articles and the course sections written in their style. It sits on top of this one, so everything here holds there too.

The sections, in the order to use them: what the text is for, where its facts come from, how its sentences and words go, how it names the app, and the last read before you hand it over. Writing interface copy with no music in it (a button, a notice, a tour step)? "Words about the app" and "Sentences" are the parts that apply.

## What we teach for: practice and understanding

This is the landing page's promise (`src/app/page.tsx`): "It's not a game. It's practice." Every lesson and exercise keeps it.

- **Practice is the point.** Every page ends in something to play, sing or hear now. Reading is the shortest part.
- **Repeat until it's automatic, not until a count.** Say loosely what "got it" feels like: "play until it feels comfortable", "try it at least a few times", "until your fingers move without thinking". Don't use exact counts ("five times", "ten clean runs"), scores or "done when", and don't get technical about it. The timer or the learner decides when to stop. There are no points and no screen that says you got it right.
- **"Practice until", or the goal said outright.** The line that says when a drill is got starts "Practice until …" ("Practice until the upstroke is as loud as the downstroke.") or names the goal ("The goal of this practice is to find the ringed {{1}} notes without looking at the neck."). Never "Stay with it until" or "Keep going until": they push. A break is always fine.
- **Muscle memory is the word for it.** Where a drill is repetition for the hands, say so by name: "Practice until the order is in your muscle memory: your fingers go 1, 3, 2, 4 without you thinking." "Muscle memory" is an explained word, so the app adds its note; say what the hands will do by themselves, not only the word.
- **Slow first.** A beginner's sung tune or first pass at a drill is slow: 40 to 65 bpm, starting at 40. Slow is for precision: there is time to hear each note and place it. The text never explains a slow tempo: at 50 bpm or under the app writes that line itself, above the tool (`slowTempoLine`).
- **Understand why it works.** Where it helps, give the one sentence of why (it is never required) that lets the learner build their own drill: what the drill trains, and why this shape or note does it. ("From Em to C only one note moves, so the change is one finger.") Don't give rationale for its own sake.
- **Make it your own.** Sometimes, not every time, end with the variation that turns a drill into a new one: change the key, the position, the rhythm or the string set ("Now start from the A string: same shape, new drill."), or let the learner pick their own notes ("Now pick another set of notes from the position and make up your own line.") with the whole position shown, every note enabled.
- **Name the sense it builds:** hands (finding the note), ears (hearing it), voice (singing it), timing (feeling the beat). A drill can say which one it's for in plain words.
- **Progress you can feel.** Point the learner at what they will notice getting easier, not at a score.

Don't use the landing page's marketing voice in lessons: no "you'll soon be…", no selling. Use the same idea, said plainly.

## Who you're writing for: the level

The same voice speaks to four levels (new, beginner, intermediate, advanced), and says less the newer the learner is. Write for the level the plan, the section or the block is for.

- **New and beginner: one new thing at a time.** One idea per exercise, one tool per step, steps of a sentence or two. The why, when there is one, is a single plain sentence; no theory past it and no name the learner hasn't met.
- **Few notes on the screen at once.** A new or beginner learner sees only the notes the drill plays: show those and hide or fade the rest (`enable` with `others`, `hide`, `mute`). A whole scale across the neck, every position, or a second tool beside the first is for intermediate and up. If the text has to say which of many notes to look at, the picture shows too many.
- **Intermediate: build on what they know.** The whole position can be on the screen with the drill's notes ringed, two ideas can share an exercise, and the why can point at a shape or a sound they already have.
- **Advanced: say less.** A short name the course has already taught can stand alone, and a step can leave the learner to pick their own notes, keys or positions.

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
- **No mental shortcuts.** The short name a teacher or a player would say is written out the first time a text uses it. "Play position 1" is "play position 1 of the A minor pentatonic scale"; "the pentatonic" is "the A minor pentatonic scale"; "play the shape up and down" says where it starts, which way it goes and where it turns ("start on the ringed {{1}} on the low E string, play both dots on each string up to the high e string, then come back down the same way"). After that the short form is enough in the same exercise. Test each step by asking what a learner who has never heard the short name would do.
- **No shorthand the learner must unpack.** A name the learner hasn't been shown is shorthand too: say what they see or do, not the label a teacher would use for it ("the neck with the notes of the A minor pentatonic scale", not "position 1"). What to sing on gets its own clause with its own verb: "Sing along on the note names.", "then sing it on \"la\"" — never hung inside another instruction ("Make up a tune from {{1}}, {{2}} and {{3}} on \"la\""). The moment to move on is the feel itself, spelled out: "once the names come without thinking", never "once you know it".
- **A chord's number is a shortcut too.** Never a bare "the 1 chord", "the 1, 4 and 5" or "the 1, 4 and 5 chords and back to 1". The first time a text counts chords it says it the long way, one chord at a time, each with the scale note it is built on: "{{chord:I}} is the 1st chord of the key, built on {{1}}. {{chord:IV}} is the 4th chord, built on {{4}}." After that the chord is its chip (`{{chord:V}}`), or "the 1st chord", "the 4th chord": an ordinal, never "the 1 chord" or "the I chord". Where the drill is to name the number, ask for it plainly: "say its number as each chord arrives: 1, 4 or 5".
- One sentence of why, at most, before the doing. No paragraphs of rationale. No "a-ha" moments for the learner to discover.
- No poetic lines ("Re rubs against it"). No hype ("amazing", "powerful", "unlock"). No hedging ("you might want to").
- Invite the learner: try, mix, make up, guess and check. Don't lecture.
- **What to do and what to notice sit on separate lines.** A line break in a text (`\n` in the JSON) starts a new line on the screen. Use one between the doing, the next thing to try, and what to notice or do when it goes wrong. The noticing line starts with what the learner just changed: "When you change the key, the chords are new but the numbers sound the same."
- **Say what stays the same in this drill, never a stock line.** Not "The notes change, the pattern doesn't." on every exercise, but the thing itself: "the slide on the G string is still {{4}} to {{5}}", "the drop is still an octave", "the tune keeps its shape".
- No jargon the text hasn't explained. No numbers out of nowhere ("not seven").

## Words

- Use one word for one thing:
  - Scale shapes on the neck are "positions" everywhere: articles, exercises, titles, headings and captions ("position 1", "the position with the root on the A string"). Never call them "box" or "pattern", even though some props are called `boxes` and the theory calculator says "box". The one place "box" may appear is the explained word's meaning (the `position` entry in `GLOSSARY`), so a learner who meets "box" elsewhere knows it's the same thing. When you touch text that still says "box" for a scale shape, change it to "position"; course stages 6, 8, 9 and 10 still have some (`grep -n -i 'box' src/features/course/stages/*.ts`). A slug stays as it is (`pentatonic-boxes`), since links point at it. "Chord box" is a different thing and stays.
  - **A position's number is not a description.** A bare "position 1" is a shortcut: it doesn't say which scale, or what the learner is looking at. The first time a text names a position, say the scale and what is on the screen ("The fret diagram below shows the notes of the A minor pentatonic scale: each dot is a note to play."); after that, "the position" or "the dots" is enough. A drill with one position on the screen names no number, in its title and headings too. A number comes in only where the drill has two or more positions to tell apart, and then with its scale the first time ("position 2 of the A minor pentatonic scale").
  - "the staff" for the five-line notation. Never "stave" or "music sheet". Never call a neck, chord box or tab a staff. Never explain what it is, at any level: no "the staff, the five lines of music". "Staff" is an explained word, so the app adds its note.
  - "the metronome" for the click. "one note per beat" for a step.
  - The thing a drill practises gets one word, the same in every step and heading of the exercise: "the crossing" for the way from one position to the next (not "the way across" in one step and "the slide" in the next), "the tune", "the run". Where it is a word a learner may not know, add it to `GLOSSARY` so the app explains it.
- Use note symbols: ♯ ♭ (C♯, B♭). Use "3rd", "5th", "♭7" in prose (exercise JSON writes degrees as `{{b7}}`). In chord names, write the chord the way the app does (Am7, G7, Cmaj7).
- A chord in exercise text is a chord token, written by its number in the major key as a Roman numeral: `{{chord:I}}`, `{{chord:ii7}}`, `{{chord:V7}}`. The app draws it as the chord's name in the key the tools are in, and pointing at it opens a card with its number, its root and its chord box. So a chord is never a bare letter in a block that moves key, and never a bare number ("A chord's number is a shortcut too", above). The block needs a key move (`moves` with `"key": "any"`) for the token to be filled in a title or heading.
- Solfège is Do Re Mi Fa Sol La Ti, capitalised. Do is always the home note.
- Put guitar fingers with frets: "play frets 1 to 4 with fingers 1, 2, 3 and 4", never "play fingers 1 2 3 4".
- A singing step says what to sing on, in these exact words, which the app explains with an (i): "on the note names" while learning the notes, else a sound ("on \"ah\"", "on \"oo\"", "on \"ee\"", "on \"la\""). Don't explain the phrase in the text. For a beginner, and for any high note, pick "oo", "ee" or a hum; keep "ah" for low and middle notes.
- **A tune is learned in stages, each one said.** Not "once you can hum the tune before it plays, sing it first": say each stage and the button that makes it. Sing along with the tune a few times; then press Tune to mute the tune and sing it over the chords alone; then press Chords to mute them too and sing it a cappella. "A cappella" is an explained word (singing with nothing playing under the voice), so it is only for the stage with every sound off.
- **The underlined line.** A line written between underscores (`_Don't reach for high notes: sing only where your voice feels easy._`) is drawn over a low band of colour in exercise and plan text. It is for care only: a line that keeps the learner from hurting their voice or hands (reaching for high notes, pushing for volume, playing through pain). Never use it to stress an ordinary instruction, a note, a control or a title. One whole short sentence, on a line of its own, said as what to do; at most one in an exercise, and not in every exercise. For a new or beginner singer it goes where they could wander up the staff: the first staff of a week, a slide, a tune they make up, a skip up to Sol. The words "reach for high notes" are an explained word (the app adds the (i) and the link to the lesson), so write those exact words and vary the rest.
- Explained words: `GLOSSARY` in `src/features/course/glossary.ts`. In AI plan text the app adds an (i) to these words, so use the word and don't define it there. Course articles get no (i), so an article defines a word the first time the course uses it, or links to the section that does.

## Words about the app

A step is also interface copy: the learner has to find a control with one hand on the guitar. Write it so they never hunt.

- **Name a control by the label on the screen, exactly**: Play, Start, Next, Skip, Start exercise, Start microphone, "Cross on". Read the label in the component (`src/features/exercises/basics/<tool>/index.tsx`, `src/components/practice/`); don't guess it. A game's answers are named as its buttons show them ("pick M3 or m3", "Major 7"), with the plain meaning beside them the first time ("M3 for a major 3rd").
- **Verb, label, where, what it starts**, in that order: "Press the Play button below to start the metronome." A button is called a button: "the Play button", "the Island 1 button", never the bare label ("Press Island 1"). Never a bare "Press the Play button." Where is one word, "below" or "above"; add whose control it is only when the step has two of them ("Press the Play button on the first tab below", "under the fret diagram").
- **One control per sentence.** "Press a chord box below to see the new shapes. Then press the Play button under them to start the metronome.", not both in one sentence. A tune or a run starts the mic with its Play, so it is one control: "Press the Play button below to hear the tune: the mic starts with it."
- **One verb per kind of control.** Press a button or a chord box. Tap a note on a staff or a neck. Use a selector. Play and sing are for the instrument and the voice, never for the screen.
- **The selector: invite, don't operate.** The row of chips a section's choice draws is "the selector", named by the label it shows: "the Key selector", "the Tempo selector", "the Position selector", "the Stage selector", "the Variant selector". The text says what to try and never which chip to tap, and never lists the options:
  - The reason to move on comes first, as a feel: "Once you can hum it before you play it, try it in another key."
  - Then the selector, in its own sentence, with what Play starts again after the change: "Use the Key selector below to change the key, then press the Play button to hear the tune there."
  - Then, on a new line, what changes and what stays: "When you change the key, the notes change but the tune keeps its shape."
  - The text that names a selector sits above it, so the selector is always "below".
  - Wrong: "Tap G in the Key row above the neck below, play the crossing there, then tap C." Right: "Play the same crossing in other keys. Use the Key selector below to change the key."
  - An exercise that states `moves` (it can be played in other keys or tempos) never mentions a selector: the app decides when the Key or Tempo selector is there and writes the line under it. Its text names the key and the tempo only as `{{=key}}` and `{{=bpm}}`, which the app fills in. The line that says what stays the same in another key opens with `{{?key}}` ("{{?key}}In another key the drone and all three notes sit higher or lower, and each skip is still the same distance."): the app shows that line only when the Key selector is there, so a player with one key never reads about another. `{{?bpm}}` does the same for a line about another tempo.
- **A picture is named by its kind and place**: "The fret diagram below shows the notes of the A major scale.", never "Under this is the neck with…". A control under it is "under the fret diagram".
- **Say what they will see next**, when it isn't obvious: "After a bar of count-in, the lit box shows the chord to play."
- **Say what to do when it goes wrong**, inside the step, calmly and as an action: "If a change comes late, keep your strumming hand going and catch the next beat 1." No blame, no "don't worry", no "try again".
- **One name for each thing on the screen**, the same in every step:
  - "ringed" for a highlighted note, "faded" for a muted one, "lit" for the box or note playing now.
  - "the metronome" (a click), "the drone", "the backing track" (whatever the app plays under the learner: the drums and bass of a backing-band, a backing-track, a song-chart, the chords under a guitar-play-along; never "the band" or "the backing"), "the game" (note-finder, interval-ears).
  - "your line" for the singer's pitch on the staff, "the chord boxes" for chord diagrams.
- **Name who does it, never a bare "it".** When the one acting is not the learner (an AI extension, the metronome, the game, the backing track), name it in that sentence: "The AI extension reads your note and rewrites the second section", not "It reads your note". Use the same name in every step, card and button of one flow: "AI extension" throughout, never "the extension" in one step and "the AI in your browser" in the next.
- **Titles and headings are labels, not sentences.** A title names what is practised in the learner's words ("Em to Am, clean and in time"). A block heading names that block's task in five words or fewer ("Only the roots", "A new order"): never "Step 1", "Warm-up" or "Exercise". If two headings in one exercise could swap places, they say too little.
- **Say what to listen for, not how it sounds.** "Listen for the bar where one note changes" tells the learner what to do; "hear how bright it sounds" tells them what to feel.

## Picture and text agree

Whenever the text has to carry something a picture could show (frets, note lists, fingerings), the picture is missing. Add a visual or a tool, and cut the text down to one sentence about it. Every note the text names is on the picture after it, and it stands out there.

What the text says the tool shows is what the tool is set to show. A step about which finger plays each note has the finger row under the tab (`show` "finger", or unset), not the pick strokes; a step about pick strokes has `show: "pick"`. Read the props beside the sentence that describes them.

## Before you hand it over

Read the text aloud in your head as a learner who knows only the earlier sections. Cut every sentence that adds nothing. Check every fact against the calculator output.

Then read it once more, one question per pass:

1. **Could I do this step with my hands full?** Each step names the control, where it is and what it starts, one control to a sentence; a selector is named, its chips are not.
2. **Could I make up the next drill from the why?** If the why only says the drill is important ("the base every skill stands on"), it isn't one. Say what makes it work ("when your note matches the drone, the two blend into one sound").
3. **Do I know when to move on?** Somewhere in each block there is a feel to reach, not a count, and it starts "Practice until" or names the goal.
4. **Is anything said twice?** A fret, a fingering or a note list the picture already shows goes.

## When you change a rule here

The four teaching skills share one `version:` (in each one's frontmatter), and every seed file records the versions it was written to. A changed rule is a new version: raise `version:` by one in all four skills and `teaching` in `DOC_VERSIONS` (`src/features/library/seed/versions.ts`) in the same commit. A typo, a path or a clearer sentence for the same rule is not a new version. "Version" in `AGENTS.md` has the whole rule.

The same voice is written down in four more places, each for a different reader. A rule changed in one is changed in all of them, in the same commit:

- `src/features/plan/model/prompt.ts`, the `writing` part: what the AI that writes plans is told. Run `src/features/plan/model/*.test.ts` after.
- `src/features/library/seed/README.md` ("Writing rules") and its `CLAUDE.md`: the rules every seed file meets.
- `src/features/plan/CLAUDE.md`: the plan flow's copy.
- The `course-article`, `exercise-example` and `review-teaching-text` skills, where they repeat it.
