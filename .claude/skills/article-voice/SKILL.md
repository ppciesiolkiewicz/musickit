---
name: article-voice
version: 6
description: How musickit articles sound - the public /learn articles and the course sections at /course written in their style. Friendly, short, "I", ideas to try at the end. Its exercises are written in teaching-voice, which it loads first. Use whenever writing or editing the prose of a /learn article or a course section (src/features/articles/content, src/features/course/lessons), alone or from the course-article skill. Plan, block and seed text is teaching-voice alone.
---

# The articles' voice

musickit has two voices, and this is the second:

- **teaching-voice** is the plan and block voice: seed exercises and plans, the AI plan prompt, glossary meanings, about lines, captions. Plain, short, practical; it says what to press and what to play.
- **article-voice** (this skill) is the voice of the pages a reader reads through: the public `/learn` articles and the course sections at `/course` written in their style. It sits on top of teaching-voice: load **teaching-voice** first. This file holds only what the articles add to it.

An article's **exercises** (an `exercise` block's `title`, `lines`, `between` and `after`) are block text: they follow every rule of teaching-voice, as a seed exercise does, with the warmth of this voice. The **prose around them** (the opening, the headings, "Before you start", "Make it your own", the closing line) is this voice.

Each /learn article's seed file records the version of this voice it was written to (`versions.voice`); a course section records the day and time it was written (`updated`).

## How it sounds

- **Friendly and casual.** Talk to one reader, like a teacher who is also a friend: "Here's the catch", "Now let's get your
  voice moving", contractions, "you" and "your".
- **A little playful.** A light image now and then ("Time to sound like a motorboat"), an invitation to play with the drill
  ("Then try it backwards for fun"). Never a joke at the reader's expense, and never hype.
- **Short.** Fewer words than feels natural: one idea to a paragraph, one or two sentences each, steps of one or two lines. Say a
  thing once: nothing the page already says (the mic note, the Your voice picker) and nothing the tool shows. Lists of three to
  five short items.
- **Propose ideas.** Each article ends with a few things to try that turn a drill into a new one ("Make it your own"), and says
  what the reader will notice getting easier.
- **The author's words win.** Where the author asks for wording that `teaching-voice` would not use (on lip rolls: "Don't worry
  if you're not on the note, or if your mic can't pick up the buzz"), keep the author's wording, and record it in the seed file's `notes`.

- **Say what a letter is.** A chord is "the C chord", "the Am chord", "C in the A shape is still the C chord", not a bare
  "C" that could be a note, a key or a chord. A bare letter is fine inside a list that has just said what it lists ("the
  open chords C, A, G, E and D") and in a chord box's own name.

## Diagrams and text take turns

- One or two diagrams, then text. Never a wall of diagrams: text comes before each diagram, between two of them (an
  exercise's `between`) and after (`after`), each line about the diagram next to it.
- Use the smallest tool that shows the point. A chord shape is a chord box (`chord-shapes` with `frets`), not a tool that
  draws four necks for it; the whole neck is one map. Point at the tool page (the CAGED explorer, a scale page) for the rest.

## What every article has

- An opening that says why the thing matters to the reader's voice or hands, in one or two short paragraphs.
- Looking after your voice (or hands) before the exercises, linking to [Look after your voice](/voice-care) and, for singing,
  the warm-ups article.
- Exercises on the page with the app's own tools, each with its heading, what to press, what to sing or play, and one feel to
  reach or one thing to do when it goes wrong.
- "Make it your own" at the end: a short list of variations, then one line on what gets easier.
- No call to join in the text: a /learn page ends every article with the same card ("Join attunr for more interactive exercises and a
  curated practice plan for every day." and **Start your plan**, `JoinCard` in `src/features/articles/ui/ArticleView.tsx`, under Pio's note about who writes the articles). The articles speak as Pio: "I", not "we".

## Course sections in this voice

A course section is the same kind of page inside the course, so all of the above holds, with three differences:

- It is one step of a course. It opens from where the course is: the section before it ("In [Do–Mi–Sol](/course/3/do-mi-sol) you sang…"), and it assumes only what earlier sections taught.
- It has no join card and no "More guides": the course moves on to the next section.
- Course pages draw no glossary note on old block sections, but a section written in this style is marked as /learn is, so use the explained word and don't define it.

## Products

- Recommend a product only when the author asks to, with why it suits a beginner.
- Say it isn't paid for. No prices, no affiliate links.

## When this changes

A changed rule here is a new `version`: raise it by one here and `ARTICLE_VOICE_VERSION` in `src/features/articles/model.ts`
in the same commit, with an entry under "Article voice" in `src/features/plan/model/CHANGELOG.md`. Don't raise an article's `versions.voice` by hand: it changes when the article is rewritten to the new voice.
