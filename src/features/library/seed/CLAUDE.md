# Library seed: rules

Format, how to add a file and the writing rules every seed plan and block meets: `README.md`. Agents read these files
through the library tools as the models to write like, so a flaw here shows up in every plan written after them.

- **Use the skills.** Writing or rewriting a seed plan or block: `exercise-example`, which reads `teaching-voice` first.
  Checking one: `review-teaching-text`. Don't write seed text without them.
- **Facts come from the calculator** (`npm run -s theory -- help`), never worked out by hand.
- **The text says what the tool can't.** No fret numbers, fingerings or note lists a neck, chord box or staff already shows. If the text has to carry them, the tool or one of its props is missing: say so.
- **Name controls as the screen does.** Play, Start, Start exercise, Start microphone, a game's answer buttons: read the label in the tool's component, and say what it starts and where it is.
- **A why is a mechanism**, one sentence the learner could build the next drill from. "This is the base of everything" is not one.
- **Done is a feel, never a count.** Each block says loosely what to reach.
- **Pick tools from the prompt's "Which tool for what"** (`plan/model/prompt.ts`), not from the file being copied.
- **A rewrite keeps the file**: same `id`, area, topic, concepts, steps and minutes; set `model` and `versions` (the
  versions of the prompt, AGENTS.md and the teaching skills it is now written to, from `PROMPT_VERSION` and
  `DOC_VERSIONS` in `versions.ts`), and rewrite `note`.
- **`versions` is never raised by hand.** It says which rules the text was written to; it changes only with a rewrite.
- **A showcase keeps its `showcase`.** The prompt names each showcase by its block id, computed from the file, so an
  edit changes the id the prompt gives without anything else to update.
- **Read it drawn**, at `/dev/examples` on the dev server. Don't paste test plans into `/plan`: that browser holds the user's own plan.
- Every change: `npm run -s seed -- check <file>`, `tsx --test src/features/library/seed/*.test.ts src/features/plan/model/*.test.ts` (cached tsx), and keep `README.md` in step.
