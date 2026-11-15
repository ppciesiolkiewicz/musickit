# Versions of the writing rules

Three documents carry a version, each raised by one when a rule changes what an AI writes (see "Version" in `AGENTS.md`):

- **Prompt**: the AI plan prompt (`prompt.ts`), the authoring guide built from it (`agentBlocks.ts`) and the page's tools for the browser's AI (`agentTools.ts`, `ui/useBlockAgentTools.ts`, `ui/useBrowserAgentTools.ts`). `PROMPT_VERSION` in `prompt.ts`. Examples don't carry it.
- **Teaching**: the four teaching skills (`teaching-voice`, `course-article`, `exercise-example`, `review-teaching-text`), one shared `version:`. `DOC_VERSIONS.teaching` in `examples/index.ts`.
- **AGENTS.md**: `Version:` in `AGENTS.md`. `DOC_VERSIONS.agents`.

Add an entry here in the same commit that raises a version, newest first: the version, the date, what changed. A test holds the newest entry of each section to its number in code.

## Prompt

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
