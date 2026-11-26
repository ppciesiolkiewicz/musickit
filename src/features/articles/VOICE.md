---
version: 2
---

# The articles' voice

The public articles at `/learn` are written in this voice, on top of the `teaching-voice` skill: load that first. This file
holds only what the articles add to it. Each article's seed file records the version it was written to (`versions.voice`).

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

## What every article has

- An opening that says why the thing matters to the reader's voice or hands, in one or two short paragraphs.
- Looking after your voice (or hands) before the exercises, linking to [Look after your voice](/voice-care) and, for singing,
  the warm-ups article.
- Exercises on the page with the app's own tools, each with its heading, what to press, what to sing or play, and one feel to
  reach or one thing to do when it goes wrong.
- A last line that points to attunr's daily plan, said plainly, once.

## Products

- Recommend a product only when the author asks to, with why it suits a beginner.
- Say it isn't paid for. No prices, no affiliate links.

## When this changes

A changed rule here is a new `version`: raise it by one here and `ARTICLE_VOICE_VERSION` in `src/features/articles/model.ts`
in the same commit. Don't raise an article's `versions.voice` by hand: it changes when the article is rewritten to the new voice.
