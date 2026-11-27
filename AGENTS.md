<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Version

Version: 3

This file and the teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`, one shared `version:` in their frontmatter) each carry a version. Every seed file in `src/features/library/seed` (plans and blocks) records the versions it was written to (`"versions": { "prompt": 5, "agents": 2, "teaching": 5 }`), so a file written to older rules can be found and rewritten. The AI plan prompt and its authoring guide carry a third, `PROMPT_VERSION` in `src/features/plan/model/prompt.ts`, which a seed file records as `prompt`.

- Raise a version by one when a rule changes what gets written: a new rule, a dropped one, a changed word. A typo, a path or a clearer sentence for the same rule is not a new version.
- Raise it in the same commit in the document and in its constant (`DOC_VERSIONS` in `src/features/library/seed/versions.ts`, or `PROMPT_VERSION`), with an entry in the changelog, `src/features/plan/model/CHANGELOG.md`: the version, the date, what changed. Tests hold the three together. The four teaching skills move as one.
- Don't raise a seed file's `versions` by hand. They change only when the file is rewritten to the current documents.

What each version of each document changed is in that changelog.

## Where the rules are

This file holds what is true for the whole repo. A feature's own rules are in the `CLAUDE.md` beside its code (`src/features/<feature>/CLAUDE.md`, `src/components/ui/CLAUDE.md`, `src/lib/looper/CLAUDE.md`), and what the feature is and where its parts live is in the `README.md` next to it. Read both before changing a feature, and keep them true in the same commit as the change.

## Committing: other agents share this checkout

Several agents often work in the main checkout at the same time, and they share its git index. So in the main checkout:

- Commit with `scripts/commit.sh "message" <your paths>`, naming only the files you changed (a folder means all of it). It commits from a temporary index and leaves everyone else's work alone.
- Never `git add`, `git commit`, `git stash`, `git reset --hard`, `git checkout -- .` or `git pull --autostash` there: each one takes in or throws away another agent's work.
- Before editing, check `git status` for files another agent has changed. If a file you need is already changed, leave it, or ask.

In your own worktree (`git worktree add`, for bigger work) git works as usual: the worktree has its own index.

## Words on the screen: load the skill first

Every word a player reads is written with a skill, loaded before the first word is written. This holds for a one-line change too: a button label, a caption, a tour step.

| What you are writing | Skill |
| --- | --- |
| A course section (`src/features/course/stages`, `src/features/course/lessons`) | `course-article` |
| A /learn article (`src/features/articles`) | `article-voice` |
| A seed exercise or plan (`src/features/library/seed`) | `exercise-example` |
| Any other text that teaches music: a glossary meaning, an about line, a caption, the lesson text on a tool page, the writing rules in the AI plan prompt | `teaching-voice` |
| Interface copy: buttons, labels, tour steps, notices, errors, empty states, modal and flow text | `design:ux-copy`, with "Words about the app" in `teaching-voice` |
| Checking any music text, and before finishing the first three | `review-teaching-text` |

There are two voices. `teaching-voice` is the plan and block voice (exercises, plans, glossary, captions). `article-voice` is the voice of /learn articles and course sections, and reads `teaching-voice` first: an article's exercises are block text. `course-article` reads `article-voice`; `exercise-example` and `review-teaching-text` read `teaching-voice`. Text that does both jobs (an exercise step that says what to press and what to play) is teaching text.

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
- Read a change to the screen on the screen: the page on the dev server, or `/admin/content/stories` for tools and `/admin/content/library?item=<id>` for a seed plan or exercise.
- Report what you checked and what you didn't ("Types clean; not checked in the browser"). A passing test is not a page that reads well.
