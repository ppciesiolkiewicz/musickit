# Dev tools

Local-only pages under `/dev` for working on the app: today the autoplan prompt (studio, examples), later other views of
the app's data. Spec: `docs/superpowers/specs/2026-10-31-prompt-devtools-design.md`.

## Rules

- **Dev only.** `src/app/dev/layout.tsx` calls `notFound()` in production; every `src/app/api/dev/*` handler starts
  with `devGate()` (`gate.ts`). `/dev` is not in the sitemap.
- **Imports.** Dev tools may import plan internals (`@/features/plan/model/*`, its UI). Nothing outside this folder,
  `src/app/dev` and `src/app/api/dev` imports dev tools.
- **`server/` is Node only** (`child_process`, `fs`) and is imported only by route files. Pure logic in `model/`, with tests.
- **Dev notes.** `copy/CopyNotes.tsx` is the one exception to the import rule: the root layout mounts it (dev only) as a floating "Notes" button. It opens the notes bar, the same on every page: all notes' count, this page's, how many are on changed example sections (on /dev/examples), HEAD, *Note a text*, *Re-pin all to HEAD*, *Clear all*, *Copy all notes*. *N on this page* opens a modal with this page's notes, each linking to its entry on `/dev/notes`; a page's notes show only there, not on the page. Opening the bar turns on note mode (*Note a text* toggles it, and so does the A key outside a text box); in note mode a click on any text opens a note, in a box six lines tall. Every note, wherever it shows (under its section, in the bar, on /dev/notes), is one `copy/NoteBar.tsx`: the note, `@commit` (the example file's for a section note, else the HEAD it was made at), edit and delete. Every note, on any page or on an example's section, is in one registry: `localStorage` `musickit.dev.copyNotes` (`copy/store.ts`, `model/copyNotes.ts`), each with the HEAD it was made at. The old `musickit.dev.comments` is moved in once. A page's notes are kept by its route: the path, and the hash where there is one, since some pages move by it (each `/dev/stories#<group>~<n>` has its own notes; `routeOf`, followed through `history.replaceState` too). Section notes are kept by the path alone. A text note also keeps its context (`copy/context.ts`): the labelled regions and headings it sits under, the app's React components that render it (from React's dev fiber, up to the router), each with the file and line of its JSX round the text, the line of JSX that renders the noted element, and the text round it; the copied Markdown gives them as `under:`, `components:`, `source:` and `around:` lines. Files and lines come from the stack React keeps of each JSX call in dev, mapped back to the source by `/api/dev/source` (Next's own `/__nextjs_original-stack-frames`, Turbopack only), so an AI tool can find what to change. A note links to its place with `<path>?note=<id><hash>` (`noteHref`; the older `#note-<id>` still opens): the page opens the notes modal, marks the note there and scrolls to its text, and /dev/examples opens its card. `/dev/notes` (`copy/NotesPage.tsx`) lists every page's notes in the order of `/sitemap.xml`, each with *Open →*, with copy, re-pin and clear for one page or all. The bar needs no plan code: /dev/examples hands it its section hashes and a `repin` (`useShowSections`).
- **A new tool** is one entry in `registry.ts` and one page under `src/app/dev/`; the index and the tab bar (`DevNav.tsx`, in the layout) both read the registry.

## History

Runs of the prompt are kept in `tools/prompt-history/` at the repo root, one JSON file per run (gitignored).

A record (`model/history.ts` `RunRecord`) holds when, mode, model (or `"pasted"`), the answers, part overrides and part
list, the prompt, the reply or error, time, cost, and the plan's title and warning count when the reply parses.

## Prompt studio (`/dev/prompt`)

Inputs (answers JSON, first or next week; next week takes a past run as last week, with the ticks made on its preview),
every prompt part (`promptParts` in the plan model) as a row to switch off or edit in place, the composed prompt, Run, and
the result: the reply rendered with the plan's real `WeekView`, its parse warnings and the raw text, beside the history.
Its state stays in `localStorage` key `musickit.dev.prompt`; "Load my /plan answers" only reads `musickit.plan`.

## Prompt examples (`/dev/examples`)

"In the prompt": the example parts `promptParts` builds for the studio's saved answers, each with its "Why it's good" note.
"Library": every example in `src/features/plan/examples` with filters (kind, area, level, showcase), marked "in prompt"
when `selectExamples` picks it for those answers. Opening a card renders it (`model/preview.ts`): an exercise as the
plan's `ExerciseCard`, a plan in the real week view, with the parser's warnings. **Copy as plan** copies any example as a
complete 7-day plan for `/plan`'s paste step (`planToCopy`: an exercise becomes a week of itself).

**Section notes.** Every section of a rendered example has a pencil at its end (`examples/Comments.tsx`, through the plan's
`SectionAsideContext`): a shortcut to a dev note (see *Dev notes*) with a `section` anchor: the example, the exercise's
address (`ex`, or `d2.e1` in a plan) and the section's index, a hash of the section (`model/comments.ts` `sectionHash`)
and the example file's last commit from `GET /api/dev/commit` (`server/git.ts`: HEAD, and each example file's last commit
and uncommitted state). When the section's hash no longer matches, the note turns orange ("section changed", with *keep*
to re-pin it); a section that is gone shows rose. The Notes bar's *Re-pin all to HEAD* here also re-pins every section
note to its section as it is now (`repinSectionNotes`; those on gone sections stay), and *Copy all notes* lists section
notes by example with file, in section order, with a warning when outdated; outdated is checked against every example
(`exampleSections`), open or not.

## Data (`/dev/data`)

What the practice plan keeps in this browser, read-only (`data/DataPage.tsx`, rows from `model/dataView.ts`): the first
questionnaire's answers (each topic with the line picked), the plans (current and history, with how many exercises are
rated), the progress log (`musickit.progress`: one row per rated exercise, newest first, with a topic filter), and the
progress summary the AI returned with each plan, which the app shows nowhere else. Every block has its raw JSON, folded,
with a copy button. Below those, everything else this site keeps: every localStorage and sessionStorage key (sorted, with
size and its value, JSON unfolded; `model/dataView.ts` `storageRows`) and each IndexedDB database's stores with record
counts only (sampler audio, NAM models). It reads through `localPlanStore` and `localProgressStore` and writes nothing, apart from what
loading a plan always does (ids for exercises stored without one).

## Kickstarter (`/dev/kickstarter`)

Replies to music schools that could become founding partners. `model/kickstarter.ts` holds what an email may say (`FACTS`:
what attunr is and what is coming (scheduling, profiles, courses to sell), the locked-in price, the 90-day trial, the 20 partners
the project needs, a say in what gets built, the video call with the founder (`CALL_MINUTES`: a live demo and a talk about being a founding partner), that it is still in demo mode (what isn't built is told as "the vision for attunr"), that it is an Australian company; the price, the trial length and the 20 come from `src/lib/foundingOffer.ts`, which the public page `/kickstarter` reads too) and how it sounds
(`VOICE`, plus reply-only and first-email-only rules); change the offer there. The next step an email asks for is that call: offered once, as a question, with the booking link (`CALL_URL`, the Calendly page "Attunr founding partner chat"; `GENERAL_CALL_URL` is for a call about anything else) and no invented time; a first email leads with why attunr is being built (a love of music, and looking for ways to help teachers, students and schools), leaves out the price and the trial, and ends on the call, and a reply offers it when they show interest and not again once it was offered. The page (`kickstarter/KickstarterPage.tsx`)
shows the brief as plain text with *Copy brief* (`outreachBrief`: the facts, the voice, the rules for a reply and for a first email, the sample emails, and the links an email may use, with public `SITE_URL` links), then what goes into it: *Voice*, *Facts*, *Sample emails* (each in full, with *Copy email*), *Links, strongest first*, *Never link*. The links are `DEMOS` in `src/app/dev/kickstarter/page.tsx`, each in a `LINK_GROUPS` group (*Lead with*: `/demo`, every demo plan and preset note; then singers, guitarists, any instrument) and in order of strength within it; the brief numbers them and tells the AI to pick from the top down and link nothing else. `LINKS_TO_AVOID` (the tuner, the chord pages, the metronome, the circle of fifths, the looper, /teach and /teachers) are listed with why, so the AI leaves them out even where a sample email links one. The brief is pasted into an AI chat, with the thread when there is one; the details about the school come from the thread, and so does the sender: a reply keeps the name and persona attunr's earlier emails used (they may go out from an outreach tool such as Explee), and signs as the founder only when there are none. With no thread the AI writes a first email with a subject line. `SAMPLE_EMAILS` are emails that went out (the first: Piotr taking over the Evia Music thread from Alex); the brief carries them for tone and shape only.

## Running the prompt

`POST /api/dev/run` runs the local `claude` CLI (`server/claude.ts`) in print mode with no tools, no MCP servers, no
saved session, only project settings, from the temp folder, and with a plain system prompt in place of Claude Code's (that
one brings auto-memory, and the model "reads its memory" instead of answering; `--bare` would avoid it but fails login).
The child also drops the `CLAUDE_CODE_*` variables of any Claude session the dev server runs in. So the model sees only the
prompt, like a player's own AI.

A run lives on the server, not in the page (`server/running.ts`): a reload, which any edit to the plan model can cause,
does not stop it. `GET /api/dev/run` lists runs in progress (the studio polls it and shows each with Cancel),
`DELETE /api/dev/run?id=` cancels one, and 10 minutes kills it. Every run is saved, failed and cancelled ones too.
`POST /api/dev/history` keeps a reply pasted from another AI; `GET /api/dev/history` lists runs, `GET /api/dev/history/<id>`
returns one.

## Code map

- `gate.ts`: `devOnly`, `devGate`, `devUi` (the overlays on real pages; `npm run dev:clean` sets `NEXT_PUBLIC_DEV_UI=off` to hide them).
- `registry.ts`: the tools listed on `/dev`.
- `model/models.ts`: the Claude models a run can use.
- `model/history.ts`: run records, summaries, ids, request checks, `describeReply`.
- `model/compose.ts`: `composePrompt` (overrides on parts), answers from text, a past run as last week, the studio's saved state.
- `server/claude.ts`: `claudeArgs`, `childEnv`, `parseClaudeResult`, `runClaude`.
- `server/running.ts`: runs in progress (`startRun`, `cancelRun`, `endRun`, `listRunning`), kept on `globalThis`.
- `server/history.ts`: `saveRun`, `readRun`, `listRuns` over `tools/prompt-history/`.
- `model/preview.ts`: an example's JSON made parseable and parsed for display; `planToCopy`; `whyOf`.
- `model/copyNotes.ts`: the notes registry: shape, Markdown, re-pin, clear, section state, links, the old comments' migration.
- `model/comments.ts`: what section notes need from the plan model: hashes, `exampleSections`, `repinSectionNotes`.
- `server/git.ts`: `exampleCommits` (HEAD and the example files' commits), for `GET /api/dev/commit`.
- `prompt/`: `PromptStudio` (state), `StudioInputs`, `PartList`, `RunPanel`, `PlanPreview`, `HistoryList`, `api.ts` (fetches), `storage.ts` (saved state, `useMounted`).
- `examples/ExampleViewer.tsx`: the examples page.
- `kickstarter/KickstarterPage.tsx`, `model/kickstarter.ts`: the founding-partner email brief; its facts, voice and samples.
- `data/DataPage.tsx`, `model/dataView.ts`: the data page and its rows (`planRows`, `logRows`).
- Routes: `src/app/api/dev/run`, `src/app/api/dev/history`, `src/app/api/dev/history/[id]`; pages `src/app/dev`.

## Instrument tuning (`/dev/pianos`) — TEMPORARY

**To delete once a sample source is chosen** (it pulls three dev dependencies just for this): `src/app/dev/pianos/`,
`src/features/devtools/pianos/`, `scripts/measure-pianos.mts`, the `pianos:measure` script and the `smplr`, `tone` and
`node-web-audio-api` dev dependencies in `package.json`, and its line in `registry.ts`.

Compares ways to play an instrument and how far each note is from A440. `pianos/instruments.ts` lists the instruments and their
sample sets: the app's Casio samples (read from the sound engine's own config), tonejs-instruments, Salamander and FatBoy files,
and their General MIDI soundfont names. `pianos/backends.ts` puts every way to play behind one shape (`PianoBackend`: `load`,
`play`), with an optional `tuning` setting: our own player over each sample set, Tone.js's Sampler over the tonejs-instruments
files, smplr's soundfont (MusyngKite) and Splendid Grand Piano, and an exact synth tone as the yardstick.

`npm run pianos:measure` (optionally `-- piano/ cello/own`) renders every note G2–C6 of every backend offline in Node
(node-web-audio-api), once as recorded and once with that measurement as its tuning, reads each note's pitch 0.3 s in with the
tuner's YIN, and writes `pianos/tuning.generated.json`. Files node-web-audio-api cannot decode (smplr's ogg/m4a) go through
macOS `afconvert`, so the script runs on a Mac. The page shows those numbers on each key; *Correct pitch* plays with the tuning;
the mic shows how far your voice is from the tapped note.
