# Versions of the writing rules

Three documents carry a version, each raised by one when a rule changes what an AI writes (see "Version" in `AGENTS.md`):

- **Prompt**: the AI plan prompt (`prompt.ts`), the authoring guide built from it (`agentBlocks.ts`) and the page's tools for the browser's AI (`agentTools.ts`, `ui/useBlockAgentTools.ts`, `ui/useBrowserAgentTools.ts`). `PROMPT_VERSION` in `prompt.ts`. Examples don't carry it.
- **Teaching**: the four teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`), one shared `version:`. `DOC_VERSIONS.teaching` in `library/seed/versions.ts`.
- **AGENTS.md**: `Version:` in `AGENTS.md`. `DOC_VERSIONS.agents`.

Add an entry here in the same commit that raises a version, newest first: the version, the date, what changed. A test holds the newest entry of each section to its number in code.

## Prompt

### 4 (2026-11-16)

- An exercise names its `steps`: 1 to 3 steps of the learning path (`trackId:n`), each in one of its concepts' tracks. It no longer writes a `level`; the app sets it from the steps (the highest of their levels). The answer format lists every concept's steps under its topic, numbered, with their levels.
- A new track, `fingerpicking` (guitar, basic chords), takes the fingerpicking step out of `strumming`, so the concepts listed are 46.
- The 117 seed blocks were raised to 4 without a rewrite: they already named their steps.

### 3 (2026-11-16)

- A new track, `double-stops` (guitar, CAGED topic, before `triads`), so the concepts listed under each topic are 45. The first triads, barre chords, the modes and the first positions on the neck now name steps to learn first; the prompt lists ids only, so only the new id shows in it.

### 2 (2026-11-16)

- The concepts listed under each topic are the tracks of the learning path (`path.ts`, NEW13): 44 in place of 67, several old concepts merged into one track (`top-string-triads` and `triads-every-set` are `triads`). The parser still reads an old id, as its track.

### 1 (2026-11-15)

- The page's tools check before they change anything: `check_practice_plan` beside `submit_practice_plan`, and `check_block` beside `write_block` and `insert_block` on the notes creator and the running plan. Each reads the AI's JSON with the same parser as the write and answers with what it would change or leave out, saving nothing.
- The prompt read through the tools, the authoring guide and the write tools' descriptions tell the AI to check, fix what the check reports, check again until it says nothing to fix, and only then send.

### 0

Everything before the prompt had a version.

## Teaching

### 5 (2026-11-12)

The block format: `cells` and `section` cells in place of `sections` and headings, a `choice` on a section or the block in place of the `step-choice` tool, hashtags in a title, no `focus`.

### 4 (2026-11-10)

"Sing on" gets its own clause; no "once you know it".

### 3 (2026-11-10)

The underlined care line (`_Don't reach for high notes._`).

### 2 (2026-11-10)

The selector, one control to a sentence, line breaks in a text, no stock lines.

### 1 (2026-11-10)

What was once called the "new teaching style".

### 0

The older style, from before the teaching skills.

## AGENTS.md

### 2 (2026-11-15)

A third version, the prompt's, with this changelog beside it; the history of every version moves here from `AGENTS.md`.

### 1 (2026-11-10)

Versions are kept: this file and the teaching skills carry one, and every example records the two it was written to.

### 0

Everything before versions were kept.
