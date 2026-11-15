# Dev tools

Local-only pages under `/dev` for working on the app: today the autoplan prompt (studio, examples), later other views of
the app's data. Spec: `docs/superpowers/specs/2026-10-31-prompt-devtools-design.md`.

## Rules

- **Dev only, apart from four.** Pages under `src/app/dev/(local)` (the `/dev` index too) answer 404 in production
  (`(local)/layout.tsx`); every `src/app/api/dev/*` handler starts with `devGate()` (`gate.ts`). The tools marked `live`
  in `registry.ts` (Compare AI models for autoplan, Prompt examples, Component stories, Data) sit under
  `src/app/dev/(live)` and are on the live site for anyone logged in: `(live)/layout.tsx` checks the session against the
  database (`peekSession`, which doesn't renew it) and answers 404 without one. Nothing on the site links to them; there
  the tab bar shows only those four and no *All tools*. `/dev` is not in the sitemap and robots.txt disallows it. A live
  tool can't use `/api/dev`: compare-models reads `compare/published.json` instead, Prompt examples drops the studio's
  answers, its links to the studio and the section notes. `gate.test.ts` checks each page sits in the folder its `live` flag says.
- **Imports.** Dev tools may import plan internals (`@/features/plan/model/*`, its UI). Nothing outside this folder,
  `src/app/dev` and `src/app/api/dev` imports dev tools.
- **`server/` is Node only** (`child_process`, `fs`) and is imported only by route files. Pure logic in `model/`, with tests.
- **Dev notes.** `copy/CopyNotes.tsx` is the one exception to the import rule: the root layout mounts it (dev only) as a floating "Notes" button. It opens the notes bar, the same on every page: all notes' count, this page's, how many are on changed example sections (on /dev/examples), HEAD, *Note a text*, *Re-pin all to HEAD*, *Clear all*, *Copy all notes*. *N on this page* opens a modal with this page's notes, each linking to its entry on `/dev/notes`; a page's notes show only there, not on the page. Opening the bar turns on note mode (*Note a text* toggles it, and so does the A key outside a text box); in note mode a click on any text opens a note, in a box six lines tall. Every note, wherever it shows (under its section, in the bar, on /dev/notes), is one `copy/NoteBar.tsx`: the note, `@commit` (the example file's for a section note, else the HEAD it was made at), edit and delete. Every note, on any page or on an example's section, is in one registry: `localStorage` `musickit.dev.copyNotes` (`copy/store.ts`, `model/copyNotes.ts`), each with the HEAD it was made at. The old `musickit.dev.comments` is moved in once. A page's notes are kept by its route: the path, and the hash where there is one, since some pages move by it (each `/dev/stories#<group>~<n>` has its own notes; `routeOf`, followed through `history.replaceState` too). Section notes are kept by the path alone. A text note also keeps its context (`copy/context.ts`): the labelled regions and headings it sits under, the app's React components that render it (from React's dev fiber, up to the router), each with the file and line of its JSX round the text, the line of JSX that renders the noted element, and the text round it; the copied Markdown gives them as `under:`, `components:`, `source:` and `around:` lines. Files and lines come from the stack React keeps of each JSX call in dev, mapped back to the source by `/api/dev/source` (Next's own `/__nextjs_original-stack-frames`, Turbopack only), so an AI tool can find what to change. A note links to its place with `<path>?note=<id><hash>` (`noteHref`; the older `#note-<id>` still opens): the page opens the notes modal, marks the note there and scrolls to its text, and /dev/examples opens its card. `/dev/notes` (`copy/NotesPage.tsx`) lists every page's notes in the order of `/sitemap.xml`, each with *Open →*, with copy, re-pin and clear for one page or all. The bar needs no plan code: /dev/examples hands it its section hashes and a `repin` (`useShowSections`).
- **A new tool** is one entry in `registry.ts` and one page under `src/app/dev/(local)` (or `(live)` with `live: true`); the index and the tab bar (`DevNav.tsx`, in the layout) both read the registry.

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
`CellAsideContext`, `ui/reader/aside.ts`): a shortcut to a dev note (see *Dev notes*) with a `section` anchor: the example, the exercise's
address (`ex`, or `d2.e1` in a plan) and the section's index, a hash of the section (`model/comments.ts` `sectionHash`)
and the example file's last commit from `GET /api/dev/commit` (`server/git.ts`: HEAD, and each example file's last commit
and uncommitted state). When the section's hash no longer matches, the note turns orange ("section changed", with *keep*
to re-pin it); a section that is gone shows rose. The Notes bar's *Re-pin all to HEAD* here also re-pins every section
note to its section as it is now (`repinSectionNotes`; those on gone sections stay), and *Copy all notes* lists section
notes by example with file, in section order, with a warning when outdated; outdated is checked against every example
(`exampleSections`), open or not.

## Compare AI models for autoplan (`/dev/compare-models`, `npm run compare-models`)

A first-week plan for each made-up player (`model/personas.ts`) from each model, to compare models and what they would
cost. `scripts/compare-models.ts` writes them (`npm run -s compare-models -- help`): Claude models through the local
claude CLI (the subscription; by default Haiku 5.5, Sonnet 5.5 and Opus 5.5, three at a time; Fable 5.2 only when named),
Ollama models through the local Ollama (`server/ollama.ts`, one at a time, with a context just large enough for the prompt and a plan, about 64k: the context's cache is what fills the memory;
`ollama` names every local model). It skips a player and model that already has a plan (a reply that parses) unless `--redo`; `--dry` lists the
runs and their estimate. Each run is saved to the history with its `persona` and token `usage`.

The page (`compare/CompareModelsPage.tsx`) runs nothing: a table of players × models (the Claude models, then any local model
that has a plan), the newest plan in each cell (`latestByCell`, `model/compare.ts`) with its parser warnings as a tag. On the live site the page has no history: it reads `compare/published.json`, the newest run per cell and their
assessments, which `npm run -s publish-model-plans` writes along with the plans. A plan's
title opens its public page in a new tab, `/demo/models/<player>--<model>` (`MODEL_PLANS` in `src/features/plan/modelPlans`,
written by `npm run -s publish-model-plans`, `scripts/publish-model-plans.ts`: the newest plan per cell that parses, copied
out of the gitignored history so the live site has it). A cell whose newest run isn't the published one says *not published*
until that is run again. Every cost is as if through the API (`model/pricing.ts`): before a run the composed prompt as input and a reply the
size of the demo plans × 1.5 for thinking as output; after, the run's tokens at list prices with no caching (`runCost`;
the CLI's `total_cost_usd` is not used, it doesn't match the list prices). A local Ollama model is priced at what OpenRouter charges for the same open model (a fine-tune as its base); one with no price in `API_PRICES` shows its token count instead.

**Assessments.** `npm run -s compare-models -- assess [--players a,b]` has the judge (`JUDGE_MODEL` in `model/assess.ts`, Fable 5.2;
`--judge` names another Claude model) mark every other model's newest plan for a player against its own newest plan for that
player, the reference. A player the judge has no plan for is skipped, so write that first (`--models claude-fable-5-2 --players <id>`).
The judge gets the prompt both plans were written from, the two plans as "reference" and "candidate" (not which model wrote
which) and the parser's warnings for each, and answers with JSON (`assessPrompt`, `parseVerdict`): a score out of 10 where 10
is as good as the reference or better, a summary, a mark out of 5 for each of `CRITERIA` (fits the player, shape of the week,
music facts, use of the tools, teaching text), and lists of what is stronger, weaker and wrong. One file per judged run in
`tools/prompt-history/assessments/<run id>.json` (`server/assessments.ts`, read by `GET /api/dev/assessments`); a reply
that doesn't parse is kept with its error. An assessment is skipped when one against today's reference exists, unless
`--redo`. On the page a judged cell shows **vs Fable 5.2 N/10**; it opens the assessment in a row under the player
(`compare/AssessmentPanel.tsx`), with links to open that plan or the reference. A mark made against an older reference
plan says so (`isCurrent`).

## Data (`/dev/data`)

What the practice plan keeps in this browser, read-only (`data/DataPage.tsx`, rows from `model/dataView.ts`): the first
questionnaire's answers (each topic with the line picked), the plans (current and history, with how many exercises are
rated), time per exercise (what the day timer counted while each card was in view, against its planned minutes;
`spentRows`), the progress log (`musickit.progress`: one row per rated exercise, newest first, with a topic filter), and the
progress summary the AI returned with each plan, which the app shows nowhere else. Every block has its raw JSON, folded,
with a copy button. Below those, everything else this site keeps: every localStorage and sessionStorage key (sorted, with
size and its value, JSON unfolded; `model/dataView.ts` `storageRows`) and each IndexedDB database's stores with record
counts only (sampler audio, NAM models). It reads through `localPlanStore` and `localProgressStore` and writes nothing, apart from what
loading a plan always does (ids for exercises stored without one).

## Kickstarter (`/dev/kickstarter`)

Replies to music schools that could become founding partners. `model/kickstarter.ts` holds what an email may say (`FACTS`:
what attunr is and what is coming (scheduling, profiles, courses to sell), the locked-in price, the 90-day trial, the 20 partners
the project needs, a say in what gets built, the video call with the founder (`CALL_MINUTES`: a live demo and a talk about being a founding partner), that it is still in demo mode (what isn't built is told as "the vision for attunr"), that it is an Australian company; the price, the trial length and the 20 come from `src/lib/foundingOffer.ts`, which the public page `/kickstarter` reads too) and how it sounds
(`VOICE`, plus reply-only and first-email-only rules); change the offer there. The next step an email asks for is that call: offered once, as a question, with the booking link (`CALL_URL`, the Calendly page "Attunr founding partner chat"; `GENERAL_CALL_URL` is for a call about anything else) and no invented time; a first email leads with why attunr is being built (a love of music, and looking for ways to help teachers, students and schools), leaves out the price and the trial, and ends on the call, and a reply offers it when they show interest and not again once it was offered. The brief also lists the enabled rows of the `plans` table (`plansSection`, read from the database by the page; none without one): what anyone pays outside the offer, named only when they ask what attunr costs, never in a first email. The page (`kickstarter/KickstarterPage.tsx`)
shows the brief as plain text with *Copy brief* (`outreachBrief`: the facts, the voice, the rules for a reply and for a first email, the sample emails, and the links an email may use, with public `SITE_URL` links), then what goes into it: *Voice*, *Facts*, *Plans*, *Sample emails* (each in full, with *Copy email*), *Links, strongest first*, *Never link*. The links are `DEMOS` in `src/app/dev/(local)/kickstarter/page.tsx`, each in a `LINK_GROUPS` group (*Lead with*: `/demo`, every demo plan and preset note; then singers, guitarists, any instrument) and in order of strength within it; the brief numbers them and tells the AI to pick from the top down and link nothing else. `LINKS_TO_AVOID` (the tuner, the chord pages, the metronome, the circle of fifths, the looper, /teach and /teachers) are listed with why, so the AI leaves them out even where a sample email links one. The brief is pasted into an AI chat, with the thread when there is one; the details about the school come from the thread, and so does the sender: a reply keeps the name and persona attunr's earlier emails used (they may go out from an outreach tool such as Explee), and signs as the founder only when there are none. With no thread the AI writes a first email with a subject line. `SAMPLE_EMAILS` are emails that went out (the first: Piotr taking over the Evia Music thread from Alex); the brief carries them for tone and shape only.

## AI costs (`/dev/costs`)

What autoplans cost us, apart from the founding-partner emails on /dev/kickstarter (`costs/CostsPage.tsx`, page `src/app/dev/(local)/costs/page.tsx`). Local only: it shows our margins, so it is not one of the live tools. It reads the same `compare/published.json` tokens as /dev/compare-models and the `plans` table.

First, *Plans* (`costs/PlanCosts.tsx`, `planYear` in `model/unitEconomics.ts`): every row of the `plans` table (read by the page from the database; without one it says so), with its price, students, allowance and delivery (Batch or at once), and what a year on it costs us at a share of its allowance (the slider; 100% is every autoplan, every month) and its *Written new* chance (`plans.new_plan_percent`, internal: the rest of its autoplans are taken from the `practice_plans` library and cost no AI but Haiku's decide call, `PICK_TOKENS` in `model/unitEconomics.ts`, an estimate made for every autoplan once any are reused; with no library row enabled for reuse every autoplan is costed as written new). The page reads the chances and the library's count with its own query, not through the account repo, since they never go on a `Plan` with the payment fee per payment (twelve on a monthly plan): every plan uses the one `SUBSCRIPTION_MODEL` (Haiku 5.5, `features/account/plans.ts`), an autoplan costed on it from the same median tokens, halved with Batch, AI notes costed as autoplans. Plans are changed in the database, not here.

Then *What one player costs* (`costs/CostPerPlayer.tsx`, `model/unitEconomics.ts`): one paying account's year on every plan of the `plans` table and each AI model, with attunr's AI writing every autoplan. A plan's tokens are the median per model of the published compare-models runs (`compare/published.json`, every input token, cached or not), priced at `API_PRICES` (Haiku 5.5 at its higher rate over a 100k prompt), with the daily emails, the payment provider's fee (once per payment, twelve on a monthly plan) and hosting, against the price. Running costs are shared; each plan has its own sliders (price, autoplans a month, *Plans reused*, Batch), started from its row and its `new_plan_percent`, beside a chart of what is left a year as autoplans a month grow, one line per model, the x axis to half as much again as its allowance. Without a database it shows the one Student offer of `src/features/account/pricing.ts`. Then a year at N accounts on a chosen plan and model, and a table of every plan and model. Nothing is saved.

The payment provider is chosen once at the top of the page (`costs/CostsPage.tsx`) and used by every section.

Last, *Other models on OpenRouter* (`costs/OpenRouterModels.tsx`, `model/openRouter.ts`): cheaper and comparable models to weigh against Haiku 5.5, at OpenRouter's list prices (with the date they were checked). None has been run on the plan prompt, so each is costed on Haiku 5.5's measured tokens: a plan's cost, how many times Haiku's, a year at the autoplans a month on the slider, and what is left of the Student price. A price comparison, not a quality one.

**The library** (`practice_plans`): plans an autoplan can be taken from instead of asking the AI, each with the answers it was written for and `enabled_for_reuse`. `npm run -s db:seed-plans` (`scripts/db-seed-plans.ts`, rows from `libraryRows` in `model/library.ts`) puts every published Fable 5.2 plan in it, enabled; a plan already there gets its reply refreshed and keeps its `enabled_for_reuse`. For more, write Fable plans with compare-models, publish them, and seed again. Check DATABASE_URL first: `.env.local` may point at Supabase.

## Code structure (`/dev/structure`, `npm run structure`)

How `src` is built, scanned from disk on every load with the TypeScript parser (`model/structure.ts`, read by
`server/structure.ts`; test files left out). Four layers, top down: `app` (routes), `features/<x>`, `components/<x>`, `lib/<x>`;
a package is one folder under a layer (loose files in `src/components` or `src/lib` make one package each). An import that
points up a layer is listed as upward. *Packages*: every package by layer; picking one colours what it imports and what
imports it, and lists its folders and files. *Render tree*: what a page renders, file by file, from the JSX tags resolved
through imports, barrels (`export … from`) and namespaces. *File*: a file's components, imports, imported by, renders,
rendered by, and `extends` both ways (interfaces, classes, `type A = B & …`). The terminal version is
`scripts/structure.ts` (`npm run -s structure -- help`: `packages`, `pkg <id>`, `tree <route|file> [N]`, `file <path>`,
`upward`, `routes`). For a drawn graph, `npm run deps:packages` writes `.deps/packages.mmd` (Mermaid, one box per package, through
dependency-cruiser's `--collapse`; open it in a Mermaid preview or mermaid.live), and `npm run deps:check` lists the imports
that break the layer rules in `.dependency-cruiser.cjs`. The SVG scripts (`deps:svg`, `deps:archi`) need Graphviz
(`brew install graphviz`).

## Running the prompt

`POST /api/dev/run` runs the local `claude` CLI (`server/claude.ts`) in print mode with no tools, no MCP servers, no
saved session, only project settings, from the temp folder, and with a plain system prompt in place of Claude Code's (that
one brings auto-memory, and the model "reads its memory" instead of answering; `--bare` would avoid it but fails login).
The child also drops the `CLAUDE_CODE_*` variables of any Claude session the dev server runs in. It also drops `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN`, so a run always uses the CLI's subscription login and never bills the API. It sets `CLAUDE_CODE_MAX_OUTPUT_TOKENS` to 64000: at the CLI's default a long plan runs over, the CLI continues in a second reply, and its `result` keeps only that last part. So the model sees only the
prompt, like a player's own AI.

A run lives on the server, not in the page (`server/running.ts`): a reload, which any edit to the plan model can cause,
does not stop it. `GET /api/dev/run` lists runs in progress (the studio polls it and shows each with Cancel),
`DELETE /api/dev/run?id=` cancels one, and 10 minutes kills it. Every run is saved, failed and cancelled ones too.
`POST /api/dev/history` keeps a reply pasted from another AI; `GET /api/dev/history` lists runs, `GET /api/dev/history/<id>`
returns one.

## Code map

- `gate.ts`: `devOnly`, `devGate`, `devUi`. `src/app/dev/(local)/layout.tsx` and `(live)/layout.tsx`: the two gates (the overlays on real pages; `npm run dev:clean` sets `NEXT_PUBLIC_DEV_UI=off` to hide them).
- `registry.ts`: the tools listed on `/dev`.
- `model/models.ts`: the Claude models a run can use: the studio's CLI aliases and the pinned `DEMO_MODELS`.
- `model/pricing.ts`, `model/personas.ts`, `model/compare.ts`, `compare/`, `server/ollama.ts`, `scripts/compare-models.ts`: /dev/compare-models.
- `model/assess.ts`, `server/assessments.ts`, `compare/AssessmentPanel.tsx`, `src/app/api/dev/assessments`: plans judged against the judge model's own plan.
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
- `costs/CostsPage.tsx`: /dev/costs.
- `model/library.ts`, `scripts/db-seed-plans.ts`: the practice-plan library's seed.
- `costs/CostPerPlayer.tsx`, `model/unitEconomics.ts`: what one paying player costs a year on each AI model.
- `costs/PlanCosts.tsx`: the plans table with what a year on each costs and leaves (`planYear`).
- `costs/OpenRouterModels.tsx`, `model/openRouter.ts`: other OpenRouter models priced on Haiku 5.5's tokens.
- `structure/StructureView.tsx`, `model/structure.ts`, `server/structure.ts`, `scripts/structure.ts`: the code structure map.
- `data/DataPage.tsx`, `model/dataView.ts`: the data page and its rows (`planRows`, `spentRows`, `logRows`).
- Routes: `src/app/api/dev/run`, `src/app/api/dev/history`, `src/app/api/dev/history/[id]`; pages `src/app/dev`.
