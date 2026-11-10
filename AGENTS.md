<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Version

Version: 1

This file and the teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`, one shared `version:` in their frontmatter) each carry a version. Every example in `src/features/plan/examples` records the two versions it was written to (`"docs": { "agents": 1, "teaching": 1 }`), so an example written to older rules can be found and rewritten.

- Raise a version by one when a rule changes what gets written: a new rule, a dropped one, a changed word. A typo, a path or a clearer sentence for the same rule is not a new version.
- Raise it in the same commit in the document and in `DOC_VERSIONS` (`src/features/plan/examples/index.ts`); a test holds the two together. The four teaching skills move as one.
- Don't raise an example's tags by hand. They change only when the example is rewritten to the current documents.

Version 0 of this file is everything before versions were kept (2026-11-10). Version 0 of the teaching skills is the older style, from before them; version 1 is what they say now, once called the "new teaching style".

## Where the rules are

This file holds what is true for the whole repo. A feature's own rules are in the `CLAUDE.md` beside its code (`src/features/<feature>/CLAUDE.md`, `src/components/ui/CLAUDE.md`, `src/lib/looper/CLAUDE.md`), and what the feature is and where its parts live is in the `README.md` next to it. Read both before changing a feature, and keep them true in the same commit as the change.

## Words on the screen: load the skill first

Every word a player reads is written with a skill, loaded before the first word is written. This holds for a one-line change too: a button label, a caption, a tour step.

| What you are writing | Skill |
| --- | --- |
| A course section (`src/features/course/stages`) | `course-article` |
| An example exercise or plan (`src/features/plan/examples`) | `exercise-example` |
| Any other text that teaches music: a glossary meaning, an about line, a caption, the lesson text on a tool page, the writing rules in the AI plan prompt | `teaching-voice` |
| Interface copy: buttons, labels, tour steps, notices, errors, empty states, modal and flow text | `design:ux-copy`, with "Words about the app" in `teaching-voice` |
| Checking any music text, and before finishing the first two | `review-teaching-text` |

`course-article`, `exercise-example` and `review-teaching-text` all read `teaching-voice` first. Text that does both jobs (an exercise step that says what to press and what to play) is teaching text.

For interface copy, `design:ux-copy` gives the shape (what an error, an empty state or a confirmation has to say) and "Words about the app" gives the wording. Where the two disagree, the app's wording wins:

- The same plain, short English as the lessons. No hype, no exclamation marks, no celebrating a result: the app has no points and no score. Say what happened and what to do next.
- A control is named by the label on the screen, exactly, and one thing has one name on every page.
- Write the copy straight into the code and report the strings you changed, old → new. Skip the skill's alternatives table and localisation notes unless the user asks for options.

`design:ux-copy` is a plugin skill. If it isn't installed, write from "Words about the app" alone and say so in the report.

## Music theory facts: use the calculator

For any fretboard or theory fact in a plan, lesson or exercise (which triads sit in a CAGED box, the chords of a key or mode, scale positions, which keys fit a progression), run `npm run theory -- help` and use its answers instead of working them out by hand. It calls the same chordKit/theory code the app draws with, so frets and boxes match the screen. If it can't answer the question, say so instead of guessing. Examples:

```
npm run -s theory -- triads G --box E --group 321,432
npm run -s theory -- box A minor C
npm run -s theory -- scale D dorian
npm run -s theory -- fit Am F C G
```

The calculator and some props say "box". Text a player reads says "position" (see "Words" in `teaching-voice`).

## Before you call it done

- Run the tests of the feature you touched, `npx tsc --noEmit 2>&1 | grep -v '^.next/'`, and eslint on the files you changed.
- Read a change to the screen on the screen: the page on the dev server, or `/dev/stories` and `/dev/examples` for tools and examples.
- Report what you checked and what you didn't ("Types clean; not checked in the browser"). A passing test is not a page that reads well.
