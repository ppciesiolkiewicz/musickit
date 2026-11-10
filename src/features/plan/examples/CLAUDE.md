# Example library: rules

Format and the rules every example meets: `README.md`. These files are the standard the AI plan prompt copies, so a flaw here shows up in every generated plan.

- **Use the skills.** Writing or rewriting an example: `exercise-example`, which reads `teaching-voice` first. Checking one: `review-teaching-text`. Don't write example text without them.
- **Facts come from the calculator** (`npm run -s theory -- help`), never worked out by hand.
- **The text says what the tool can't.** No fret numbers, fingerings or note lists a neck, chord box or staff already shows. If the text has to carry them, the tool or one of its props is missing: say so.
- **Name controls as the screen does.** Play, Start, Start exercise, Start microphone, a game's answer buttons: read the label in the tool's component, and say what it starts and where it is.
- **A why is a mechanism**, one sentence the learner could build the next drill from. "This is the base of everything" is not one.
- **Done is a feel, never a count.** Each block says loosely what to reach.
- **Pick tools from the prompt's "Which tool for what"** (`model/prompt.ts`), not from the example being copied.
- **A rewrite keeps the file**: same `id`, level, area, topic, concepts and minutes; set `updated`, `model` and `docs` (the versions of AGENTS.md and the teaching skills it is now written to, from `DOC_VERSIONS` in `index.ts`), and rewrite `note`.
- **`docs` is never raised by hand.** It says which rules the text was written to; it changes only with a rewrite. `/dev/examples` shows it as two tags and marks the ones behind.
- **Read it drawn**, at `/dev/examples` on the dev server. Don't paste test plans into `/plan`: that browser holds the user's own plan.
- Every change: `tsx --test src/features/plan/examples/*.test.ts src/features/plan/model/*.test.ts` (cached tsx), and keep `README.md` in step.
