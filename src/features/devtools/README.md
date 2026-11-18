# Dev tools

Local-only pages under `/dev` for working on the app: today the autoplan prompt (studio), the library, later other views of
the app's data. Spec: `docs/superpowers/specs/2026-10-31-prompt-devtools-design.md`.

## Rules

- **Dev only.** `src/app/dev/layout.tsx` calls `notFound()` in production, for everyone, logged in or not; every
  `src/app/api/dev/*` handler starts with `devGate()` (`gate.ts`). In development no login is needed: `/dev` is a public
  path (`src/lib/publicPaths.ts`). `/dev` is not in the sitemap and robots.txt disallows it.
- **Imports.** Dev tools may import plan internals (`@/features/plan/model/*`, its UI). Nothing outside this folder,
  `src/app/dev` and `src/app/api/dev` imports dev tools, except `gate.ts`, which any file may import.
- **`server/` is Node only** (`child_process`, `fs`) and is imported only by route files. Pure logic in `model/`, with tests.
- **Dev notes.** `copy/CopyNotes.tsx` is the one exception to the import rule: the root layout mounts it (dev only) as a floating "Notes" button. It opens the notes bar, the same on every page: all notes' count, this page's, how many are on changed seed sections (on /dev/library), HEAD, *Note a text*, *Re-pin all to HEAD*, *Clear all*, *Copy all notes*. *N on this page* opens a modal with this page's notes, each linking to its entry on `/dev/notes`; a page's notes show only there, not on the page. Opening the bar turns on note mode (*Note a text* toggles it, and so does the A key outside a text box); in note mode a click on any text opens a note, in a box six lines tall. Every note, wherever it shows (under its section, in the bar, on /dev/notes), is one `copy/NoteBar.tsx`: the note, `@commit` (the example file's for a section note, else the HEAD it was made at), edit and delete. Every note, on any page or on an example's section, is in one registry: `localStorage` `musickit.dev.copyNotes` (`copy/store.ts`, `model/copyNotes.ts`), each with the HEAD it was made at. The old `musickit.dev.comments` is moved in once. A page's notes are kept by its route: the path, and the hash where there is one, since some pages move by it (each `/dev/stories#<group>~<n>` has its own notes; `routeOf`, followed through `history.replaceState` too). Section notes are kept by the path alone. A text note also keeps its context (`copy/context.ts`): the labelled regions and headings it sits under, the app's React components that render it (from React's dev fiber, up to the router), each with the file and line of its JSX round the text, the line of JSX that renders the noted element, and the text round it; the copied Markdown gives them as `under:`, `components:`, `source:` and `around:` lines. Files and lines come from the stack React keeps of each JSX call in dev, mapped back to the source by `/api/dev/source` (Next's own `/__nextjs_original-stack-frames`, Turbopack only), so an AI tool can find what to change. A note links to its place with `<path>?note=<id><hash>` (`noteHref`; the older `#note-<id>` still opens): the page opens the notes modal, marks the note there and scrolls to its text, and a section note opens its seed item on /dev/library. `/dev/notes` (`copy/NotesPage.tsx`) lists every page's notes in the order of `/sitemap.xml`, each with *Open →*, with copy, re-pin and clear for one page or all. The bar needs no plan code: /dev/library hands it its section hashes and a `repin` (`useShowSections`).
- **A new tool** is one entry in its group in `registry.ts` (`DEV_GROUPS`: AI plan, Content, Player data, Code, Pitch) and one page under `src/app/dev`; the index and the tab bar (`DevNav.tsx`) both read the registry and show the groups, each in its colour.
- **Not here: running the app.** Reading and answering what players send (the messages inbox) is `/admin`, `src/features/admin`. The tab bar links over to it.

## History

Runs of the prompt are kept in `tools/prompt-history/` at the repo root, one JSON file per run (gitignored).

A record (`model/history.ts` `RunRecord`) holds when, mode, model (or `"pasted"`), the answers, part overrides and part
list, the prompt, the reply or error, time, cost, and the plan's title and warning count when the reply parses.

## Prompt studio (`/dev/prompt`)

Inputs (answers JSON, first or next week; next week takes a past run as last week, with the ticks made on its preview),
every prompt part (`promptParts` in the plan model) as a row to switch off or edit in place, the composed prompt with *Copy prompt*, a box to paste the reply from whichever AI it was run
in (*Keep in history*), and the result: the reply rendered with the plan's real `WeekView`, its parse warnings and the raw
text, beside the history. The page doesn't run the prompt itself; `scripts/compare-models.ts` does, from the command line.
Its state stays in `localStorage` key `musickit.dev.prompt`; "Load my /plan answers" only reads `musickit.plan`.

## Questionnaire (`/dev/questionnaire`)

Every screen of the first questionnaire stacked (`questionnaire/QuestionnaireLab.tsx`, from `questionSteps`), with *Reset answers*, and beside it what the answers do: topic rungs, area levels, each skill's steps marked known, within reach, open or ahead by `reach`, and the `startOutcome` scores.

**Teacher sliders** (the second view, `questionnaire/TeacherSlidersLab.tsx`, `model/teacherSliderLab.ts`): the real `TopicSliders` of a teacher's student page on three made-up students (brand new; a few weeks in; many ratings, all from `EXAMPLE_STUDENTS`), each opening at the topic's score today with its start-of-plan tick. "Now" is the day after the newest rating, never the clock. Moving a slider shows what the plan maker receives for each topic: the rung from `raisedAnswers` and the `outcome()` score, before and after the teacher's value (`receive`). It writes nothing.

## API routes (`/dev/api`)

Every `route.ts` under `src/app/api`, read from disk on each load (`server/apiRoutes.ts`, parsed by `model/apiRoutes.ts`):
the URL, each exported method with the `/** */` comment just above it (a method without one is marked), *signed in* when
the file calls `signedIn(` and *dev only* when it calls `devGate(`, and the file as a `vscode://` link. A route's docs are
its handler comments, so keep them saying what it takes and returns. There is no OpenAPI spec.

## Compare AI models for autoplan (`npm run compare-models`)

A first-week plan for each made-up player (`model/personas.ts`) from each model, to compare models and what they would
cost. `scripts/compare-models.ts` writes them (`npm run -s compare-models -- help`): Claude models through the local
claude CLI (the subscription; by default Haiku 5.5, Sonnet 5.5 and Opus 5.5, three at a time; Fable 5.2 only when named),
Ollama models through the local Ollama (`server/ollama.ts`, one at a time, with a context just large enough for the prompt and a plan, about 64k: the context's cache is what fills the memory;
`ollama` names every local model). It skips a player and model that already has a plan (a reply that parses) unless `--redo`; `--dry` lists the
runs and their estimate. Each run is saved to the history with its `persona` and token `usage`.

`npm run -s publish-model-plans` (`scripts/publish-model-plans.ts`) copies the newest run per player and model (`latestByCell`, `model/compare.ts`) and their assessments out of the gitignored history into `compare/published.json`, for the token figures on /dev/costs. Every cost is as if through the API (`model/pricing.ts`): before a run the composed prompt as input and a reply the
size of the demo plans × 1.5 for thinking as output; after, the run's tokens at list prices with no caching (`runCost`;
the CLI's `total_cost_usd` is not used, it doesn't match the list prices). A local Ollama model is priced at what OpenRouter charges for the same open model (a fine-tune as its base); one with no price in `API_PRICES` shows its token count instead.

**Assessments.** `npm run -s compare-models -- assess [--players a,b]` has the judge (`JUDGE_MODEL` in `model/assess.ts`, Fable 5.2;
`--judge` names another Claude model) mark every other model's newest plan for a player against its own newest plan for that
player, the reference. A player the judge has no plan for is skipped, so write that first (`--models claude-fable-5-2 --players <id>`).
The judge gets the prompt both plans were written from, the two plans as "reference" and "candidate" (not which model wrote
which) and the parser's warnings for each, and answers with JSON (`assessPrompt`, `parseVerdict`): a score out of 10 where 10
is as good as the reference or better, a summary, a mark out of 5 for each of `CRITERIA` (fits the player, shape of the week,
music facts, use of the tools, teaching text), and lists of what is stronger, weaker and wrong. One file per judged run in
`tools/prompt-history/assessments/<run id>.json` (`server/assessments.ts`); a reply
that doesn't parse is kept with its error. An assessment is skipped when one against today's reference exists, unless
`--redo`. An assessment made against an older reference plan says so (`isCurrent`).

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

## Progress (`/dev/progress`)

The progress outcome (`outcome()` in `plan/model/outcome.ts`) of whoever is signed in, or of this browser without a
database, as bare tables (`progress/ProgressPage.tsx`): first its inputs (the questionnaire answers history, the plans, the
progress entries, the day-timer records with the date each is counted on), then its outputs (streak and time, per area, per
topic, per concept). A date field sets `asOf` (today at first); a date before an entry drops it out. It reads through
`usePlan`, `useProgress` and `useAllPlanTimes` and writes nothing.

## Learning path (`/dev/path`)

The learning path (`plan/model/path.ts`, NEW13: every concept is a track with steps), in four views: **Path**, **Slope**,
**Boxes** and **Bars**. The area buttons and *Student on the path* are shared (not on Bars); on Slope a step's ring is its state, the step the student is on bold.

**Path** (`path/JourneyView.tsx`, the first view, made to show to studios). Four figures for the area (skills, steps,
skills that span levels, steps read from the tools), then the topics down and the levels across. Every skill is a row
with a block in each level its steps reach, holding that level's steps (a filled dot: a tool's level stands for it; a
dashed one: not yet), and a ribbon joins its blocks; a level its steps skip shows "keeps going". Hovering or picking a
block lights the skill, what it builds on (blue) and what builds on it (violet), and dims the rest; picking one also
opens its detail below. With a student on the path, a block's edge is the skill's state and each step has a square.

**Slope** (`path/SlopeView.tsx`; design in `docs/superpowers/specs/2026-11-16-path-slope-design.md`). Every step of the
area placed by its level and its depth (`depthOf`/`slope` in `plan/model/path.ts`: how deep its chain of steps to learn
first runs), one column per depth inside a level, rows sorted by where a track's first step falls. *As it is* draws
`PATH`; *Proposed* draws `model/slopeProposal.ts` (the named prerequisites and the double-stops track), with new links
dashed orange and each step that moved marked +N. Hovering or picking a step lights its whole chain both ways; the
detail below counts the chain under it. The picture zooms and pans (drag or scroll to move, ctrl/⌘ + scroll or pinch
to zoom, *Fit* shows the whole area); the track names follow the zoom and the vertical pan. Once the proposal is settled it moves into `PATH` and the file goes.

**Boxes**: the diagram (`path/PathView.tsx`, nodes from
`model/path.ts`). `?concept=<id>` opens it on that concept's area with the concept picked (/dev/library links here). One area at a time (Guitar, Voice, Theory & ear): its six questionnaire topics are rows, the four levels
are columns, each cell starts with the topic's questionnaire line for that level, and every concept of `CONCEPTS` sits in
the cell of its topic and its first step's level. An arrow runs to a concept from each one a step of it names to learn first (`after`). A concept's edge is
green with a green dot when a seed block (`src/features/library/seed/blocks`) is tagged with it and grey when none is, a
violet dot says a seed plan's exercise is, and a dashed edge says its course page is missing or only planned. Picking a concept lights its whole chain
(`chain`: everything it rests on and everything resting on it) and lists, under the diagram, what it builds on and leads
to, its course page, its seed blocks and plans and its steps. The line beside the area buttons counts the gaps (`gaps`).

**Steps inside a concept** (`model/steps.ts`, read from `plan/model/path.ts`). The numbered lines in a box are its
track's steps, easiest first, each with its own level. Blue ones are read from a ladder the code already has
(`plan/model/ladders.ts`: the tools' levels in `exercises/basics/levels.ts`, the ear game's levels, the tune and run
stages), named on the step as `ladder: "ladderId:key"`. Amber ones are "not implemented" until a tool has a level for
them. A box grows with its steps. Under the diagram, a closed list has the ladder steps no step of the path stands for.

**A student on the diagram** (`model/stepProgress.ts`). *Student on the diagram* lays one player's progress over the path:
the player in this browser (read through `usePlan` and `useProgress`, nothing written) or a made-up one, from new players to advanced ones (a lead and a chord guitarist, a singer, theory and ear, a guitarist back after a break)
(`EXAMPLE_STUDENTS`). It is the teacher's view of a student, tried here first (NEW12, NEW13 in `tasks.txt`). A concept's
edge turns green when its newest rating is 4 stars or more and amber when it is less, as the progress outcome has it.
Each step gets a square: green solid, amber working, empty not started, dashed for a planned step, which can't be
tracked. For a made-up student the step a rating counts for is read from the rated exercise's own tools (`stepOf` in
`plan/model/path.ts`: the `level` kept on a tool, or the stage of the tune or run), the hardest one when several are in
it; a solid step makes the easier ones under it solid. The player in this browser is read by the composer's rule, so the
page that checks the composer shows what it works on (`entryProgress`): a rating counts for the steps its exercise names
and every step before them, and a step is solid exactly when `solidRatedAt` (`plan/model/daySteps.ts`) has it, so a
newer low rating on an easier step stays amber. The bold step is the one the student is on, with the whole weeks since its first rating
while it is not solid: time on a step is shown as a number, and nothing is called stuck. Picking a concept lists each
tracked step's ratings and dates. On Slope the student's steps also carry their reach marks (from `reach()` in
`plan/model/reach.ts`): their questionnaire answers (each persona has its own `topics`; the player in this browser their
last ones) and their solid steps (`studentReach` for a made-up student; `playerReach` for the player in this browser, as the
composer gets them: their answers raised by their ratings, `raisedAnswers`, and `solidRatedAt(entries)`). A step within reach is dashed blue and says "next" (or "start" where the
questionnaire puts them), a known step not rated solid says "known", and a step ahead is faded. Nothing is written by
hand: the page (`src/app/dev/path/page.tsx`) builds the nodes on the server from `CONCEPTS`, `TOPICS`, the course and the
library's seed files, so the diagram changes when they do. It writes nothing.

**Bars** (`path/ProposalView.tsx`). The third view: each track drawn as a bar from the level
of its first step to the level of its last, its steps in the columns of their levels, so tracks in one topic overlap. A
step's `after` is drawn as an arrow (into another area: listed under the diagram). Picking a track lists the concepts
from before the path it took the place of, and its steps. Tests (`plan/model/path.test.ts`) keep the path whole: every
old concept in exactly one track, levels never go down, ladder steps real and used once, `after` never pointing at a
higher level. It has no student overlay.

**Blocks for a step.** Every Slope step carries a badge with how many blocks practise it (amber `!`: none), and each
step in the Path and Boxes detail a link; both open `/dev/block?step=<trackId:n>` in a new tab, which renders each block
as the player sees it in a plan (`block/BlockPage.tsx`, `src/app/dev/block`; `?id=<block id>` renders one). The blocks
come from the code, not the database (`model/stepBlocks.ts`): seed blocks by the steps their file names, then any seed
plan exercise or seed block whose tools say the step (`stepOf`), then those that only tag the track at the step's level,
marked "level match only". A test holds that every step has a block.

## Stories (`/dev/stories`)

Every learning component in many set-ups (`stories/`). The sidebar has three sections: *AI Autoplan Tools* (every tool in
`TOOLS`, with hand-written stories in `stories.ts` and every tool cell of the seed), *Components* (`uiStories.tsx`, React
components that are not AI tools) and *Missing tools (stubs)*: the new tools of tasks.txt's MissingTools series, not built
yet. A stub (`stubs.ts`, drawn by `stubStories.tsx`) is a card with what the tool is for, which seed steps wait on it, what
is still open and its planned props; it is not in `TOOLS`, so the prompt never offers it and no seed file can use it (a
test holds this). Building the tool means adding it to `TOOLS` and deleting its stub.

## Library (`/dev/library`)

A bare-table view of the practice-plan library through the same query functions as the MCP tools (`features/library/server`): coverage by topic and level and by concept (blocks, plans, times, minutes), the plans (title, model, versions, days), and the blocks of the topic in `?topic=` (title, level, concepts, model, versions, times, minutes, ratings per star). A plan or block that comes from a seed file has a *Seed* tag after its title, and a version older than the current one (`PROMPT_VERSION`, `DOC_VERSIONS`) is amber, one not recorded grey, so files written to older rules stand out. `?player=<user id>` is passed through `devScope`; `?include_not_enabled=1` (toggled by a link) also shows what is not enabled for reuse. Without a database, or when the query fails (for example migration 0019 is not applied), it says so in a line. The one page for the library's plans and blocks; it replaced the examples page.

**One item drawn.** A plan's or block's title in the tables links to `?item=<id>#item`, which draws it below the tables
(`library/LibraryItem.tsx`; `loadItem` in `library/load.ts`, `library/item.ts`). A plan row draws from the seed plan with
that id; a block row from the seed block whose computed id (`blockIdOf(blockKeyOf(parseExercise(...).block))`) matches,
else from the database block's content (`getBlock`, under the page's scope). A seed block's file id works too. With
neither, a line says it was not found. Seed items draw without the database. The head shows the versions it was written
to as pills against the current ones (`teaching`, `agents` against `DOC_VERSIONS`, `prompt` against `PROMPT_VERSION`;
`v—` when not recorded, amber when older), the model, a showcase's feature, the note, and the tools it uses. Under it,
the concepts its exercises are tagged with (`model/exampleSteps.ts`), each a link to `/dev/path?concept=<id>` and each
with the step its tools are on, read with `stepOf` as a player's rating is: the step's name, "no step" (the concept has a
ladder but no tool sets a level or stage) or "no ladder". A plan gathers them over its exercises and says how many tag
no concept. The body renders it (`model/preview.ts`): an exercise as the plan's `ExerciseCard`, a plan in the real week
view, with the parser's warnings.

**Section notes.** Every section of a drawn seed item has a pencil at its end (`library/Comments.tsx`, through the plan's
`CellAsideContext`, `ui/reader/aside.ts`): a shortcut to a dev note (see *Dev notes*) with a `section` anchor: the seed
file's id, the exercise's address (`ex`, or `d2.e1` in a plan) and the section's index, a hash of the section
(`model/comments.ts` `sectionHash`) and the file's last commit from `GET /api/dev/commit` (`server/git.ts`: HEAD, and each
seed file's last commit and uncommitted state). When the section's hash no longer matches, the note turns orange
("section changed", with *keep* to re-pin it); a section that is gone shows rose. The page hands the Notes bar every seed
item's sections (`SeedSections`, `exampleSections`), open or not, so *Re-pin all to HEAD* here also re-pins every section
note and *Copy all notes* warns on outdated ones. A section note links to `/dev/library?item=<seed id>&note=<id>#item`
(`noteHref`), whatever route it was made on. A block with no seed file is drawn without pencils.

Code: `library/load.ts` (the loaders), `library/params.ts` (address parameters, minutes), `library/item.ts` (the item to
draw), `library/LibraryPage.tsx` (tables), `library/LibraryItem.tsx`, `src/app/dev/library`.

## Kickstarter (`/dev/kickstarter`)

Two pages under one nav (`kickstarter/KickstarterNav.tsx`: *Students*, *Teachers*); the Kickstarter tab of the dev nav is lit on both.

**Students** (`/dev/kickstarter`, `kickstarter/StudentOfferPage.tsx`): the offer to a person who practises on their own, with no AI brief (ads are written from it later). `model/kickstarterStudents.ts` holds it: `STUDENT_OFFER_LINE`; `PILLARS`, the three things it stands on, each with a promise and the facts true today (the daily plan fitted to the student, put together from the library with no AI and unlimited, with why "friendly" is true; the change, which is the daily reminder, short focused practice and progress tracking, with the learning path under it; the engaging, interactive exercises, with why "engaging" is true); `STUDENT_TERMS` (free in beta, signing up is leaving a few details, the first 500 pay half the yearly price, locked in, when paid plans open; no payment exists, so nobody is counted and no date is given; the numbers are in `src/lib/studentOffer.ts`, read from `PRICING.player`); `STUDENT_NEVER` (what nothing written for a student says). The page shows the line with *Copy offer* (`studentOffer`: all of it as one text), the pillars, *The terms*, *Never say*, *Pages to show, strongest first* (`STUDENT_DEMOS`: the demo plans and the tools, no lesson notes) and *The full offer as text*.

**Teachers** (`/dev/kickstarter/teachers`). Replies to music schools that could become founding partners. `model/kickstarter.ts` holds what an email may say (`FACTS`: weekly plans put together from the library with no AI and steered by a slider per topic, a student's progress on the learning path as /dev/path draws it (every skill a row of steps across the four levels; told as the vision),
what attunr is and what is coming (scheduling, profiles, courses to sell), the locked-in price, the 90-day trial, the 20 partners
the project needs, a say in what gets built, the video call with the founder (`CALL_MINUTES`: a live demo and a talk about being a founding partner), that it is still in demo mode (what isn't built is told as "the vision for attunr"), that it is an Australian company; the price, the trial length and the 20 come from `src/lib/foundingOffer.ts`, which the public page `/kickstarter` reads too) and how it sounds
(`VOICE`, plus reply-only and first-email-only rules); change the offer there. The next step an email asks for is that call: offered once, as a question, with the booking link (`CALL_URL`, the Calendly page "Attunr founding partner chat"; `GENERAL_CALL_URL` is for a call about anything else) and no invented time; a first email leads with why attunr is being built (a love of music, and looking for ways to help teachers, students and schools), leaves out the price and the trial, and ends on the call, and a reply offers it when they show interest and not again once it was offered. The brief also lists the enabled rows of the `plans` table (`plansSection`, read from the database by the page; none without one): what anyone pays outside the offer, named only when they ask what attunr costs, never in a first email. The page (`kickstarter/KickstarterPage.tsx`)
shows the brief as plain text with *Copy brief* (`outreachBrief`: the facts, the voice, the rules for a reply and for a first email, the sample emails, and the links an email may use, with public `SITE_URL` links), then what goes into it: *Voice*, *Facts*, *Plans*, *Sample emails* (each in full, with *Copy email*), *Links, strongest first*, *Never link*. The links are `TEACHER_DEMOS` in `kickstarter/demos.ts`, each in a `LINK_GROUPS` group (*Lead with*: `/demo`, every demo plan and preset note; then singers, guitarists, any instrument) and in order of strength within it; the brief numbers them and tells the AI to pick from the top down and link nothing else. `LINKS_TO_AVOID` (the tuner, the chord pages, the metronome, the circle of fifths, the looper, /teach and /teachers) are listed with why, so the AI leaves them out even where a sample email links one. The brief is pasted into an AI chat, with the thread when there is one; the details about the school come from the thread, and so does the sender: a reply keeps the name and persona attunr's earlier emails used (they may go out from an outreach tool such as Explee), and signs as the founder only when there are none. With no thread the AI writes a first email with a subject line. `SAMPLE_EMAILS` are emails that went out (the first: Piotr taking over the Evia Music thread from Alex); the brief carries them for tone and shape only.

## AI costs (`/dev/costs`)

What autoplans cost us, apart from the founding-partner emails on /dev/kickstarter (`costs/CostsPage.tsx`, page `src/app/dev/costs/page.tsx`). It reads `compare/published.json` (the newest run per cell, written by `npm run -s publish-model-plans`) for its tokens, and the `plans` table.

First, *Plans* (`costs/PlanCosts.tsx`, `planYear` in `model/unitEconomics.ts`): every row of the `plans` table (read by the page from the database; without one it says so), with its price, students, allowance and delivery (Batch or at once), and what a year on it costs us at a share of its allowance (the slider; 100% is every autoplan, every month) and its *Written new* chance (`plans.new_plan_percent`, internal: the rest of its autoplans are taken from the `practice_plans` library and cost no AI but Haiku's decide call, `PICK_TOKENS` in `model/unitEconomics.ts`, an estimate made for every autoplan once any are reused; costed at that chance even when the local library is empty, as it would be in production; the page notes when it is). The page reads the chances and the library's count with its own query, not through the account repo, since they never go on a `Plan` with the payment fee per payment (twelve on a monthly plan): every plan uses the one `SUBSCRIPTION_MODEL` (Haiku 5.5, `features/account/plans.ts`), an autoplan costed on it from the same median tokens, halved with Batch, AI notes costed as autoplans. Each plan has a row paid monthly and one paid yearly. Plans are changed in the database, not here.

Then *What one player costs* (`costs/CostPerPlayer.tsx`, `model/unitEconomics.ts`): one paying account's year on every plan of the `plans` table, with attunr's AI writing every autoplan, in one chart: x is the share of each plan's allowance used (0 to 150%, so a plan of 8 autoplans and one of 300 sit side by side), y is what is left of the price a year or the margin (a switch), one line per plan, on the model picked (default `SUBSCRIPTION_MODEL`). A plan's tokens are the median per model of the published compare-models runs (`compare/published.json`, every input token, cached or not), priced at `API_PRICES` (Haiku 5.5 at its higher rate over a 100k prompt), with the daily emails, the payment provider's fee (once per payment, twelve on a monthly plan) and hosting, against the price. Running costs are shared; a switch costs every plan paid monthly or yearly. Each plan is a tab with its own sliders (price a month, price a year, allowance, *Plans reused*, Batch), started from its row and its `new_plan_percent`, and an S button that solos it: with any plan soloed, only soloed plans are drawn. A dashed *Mix of all plans* line is one average paying account: each plan as it is on its tab now (price, allowance, reuse, Batch) weighted by a share per plan (sliders, started from the same mix as *Over time*, `startMix` in `model/growth.ts`: Student 73, Teacher Basic 18, Teacher Pro 9; a disabled plan at 0); left is the weighted average, margin the weighted left over the weighted price. It is drawn whatever is soloed and can be turned off. Without a database it shows the one Student offer of `src/features/account/pricing.ts`. Then a year at N accounts on the open tab's plan, and a table of every plan on every model. Nothing is saved.

Then *Over time* (`costs/OverTime.tsx`, `model/growth.ts`): what the business is worth month by month, from the enabled plans with their monthly and yearly prices and free trial. Sliders for the trials started in month 1 and their growth, the share that pays, the share paying yearly, monthly churn, yearly renewal, the plan mix of new payers, the allowance used, fixed costs, the months and a value multiple. `project` runs the months: a paying trial starts paying in its month, a monthly payer pays each month until they leave, a yearly payer at each year they stay; each account costs its AI on `SUBSCRIPTION_MODEL` (with its plan's reuse) and a daily email, a trial that doesn't pay costs the same for its days, payment fees per payment, fixed costs a month. It shows paying accounts, monthly and yearly revenue, a value (yearly revenue × the multiple), profit to date and the month from which it stays in profit, a chart (money a month, profit to date, or accounts), and each plan's lifetime value paid monthly and yearly (`lifetimeValue`). A projection from the sliders, not a forecast.

The payment provider is chosen once at the top of the page (`costs/CostsPage.tsx`) and used by every section, and so are the fixed costs: a list of the services that cost the same whatever the number of accounts (Vercel, Supabase, Resend, Google Workspace, the domain, PostHog, and ElevenLabs for the sampler, off at first), each with a checkbox, at list prices for one seat with the date checked (`model/fixedCosts.ts`). Their total is the fixed costs of the year at N accounts and of *Over time*.

Last, *Other models on OpenRouter* (`costs/OpenRouterModels.tsx`, `model/openRouter.ts`): cheaper and comparable models to weigh against Haiku 5.5, at OpenRouter's list prices (with the date they were checked). None has been run on the plan prompt, so each is costed on Haiku 5.5's measured tokens: a plan's cost, how many times Haiku's, a year at the autoplans a month on the slider, and what is left of the Student price. A price comparison, not a quality one. Models that suit a step of the autoplan recipe carry a badge (`fit` and `ROLES` in `model/openRouter.ts`): *Assess* (a cheap call that judges the seed-library matches and picks the writer), *Write* (most new plans) and *Hard plans* (the few sent up); a switch shows one step's picks, a column costs one assess call (`PICK_TOKENS`), and the recipe itself is behind the (i) by the heading. The picks are from price and description, not runs.

**The library** (`practice_plans`): plans an autoplan can be taken from instead of asking the AI, each with the answers it was written for and `enabled_for_reuse`. `npm run -s db:seed-plans` (`scripts/db-seed-plans.ts`, rows from `seedLibraryRows` in `model/library.ts`) puts in every seed plan in `src/features/library/seed/plans` (`source` "seed"), enabled; a plan already there gets its title, source, answers, model, reply and versions refreshed and keeps its `enabled_for_reuse`. A former plan example keeps its id (`guitar-beginner`), the id `DEMO_PLANS` names, so a demo and its library plan share it (both read the seed file). A seed plan has the answers, model and versions its file records (`../library/seed/README.md`). Check DATABASE_URL first: `.env.local` may point at Supabase.

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

`scripts/compare-models.ts` runs the local `claude` CLI (`server/claude.ts`) in print mode with no built-in tools, no MCP servers but the library's (`--mcp`, default `http://localhost:3000/api/dev/mcp`, so the dev server must be running), no
saved session, only project settings, from the temp folder, and with a plain system prompt in place of Claude Code's (that
one brings auto-memory, and the model "reads its memory" instead of answering; `--bare` would avoid it but fails login).
The child also drops the `CLAUDE_CODE_*` variables of any Claude session the dev server runs in. It also drops `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN`, so a run always uses the CLI's subscription login and never bills the API. It sets `CLAUDE_CODE_MAX_OUTPUT_TOKENS` to 64000: at the CLI's default a long plan runs over, the CLI continues in a second reply, and its `result` keeps only that last part. So the model sees the
prompt and the library tools, as an agent planning in Claude Code does.

10 minutes kills a run. Every run is saved, failed ones too.
`POST /api/dev/history` keeps a reply pasted from another AI; `GET /api/dev/history` lists runs, `GET /api/dev/history/<id>`
returns one.

## Code map

- `gate.ts`: `devOnly`, `devGate`, `devUi`: the one dev flag. No file reads `NODE_ENV` to ask "is this development?" on its own; it calls `devOnly()` (anything, a route included), `devGate()` (an `/api/dev` handler) or `devUi()` (something drawn on a real page). A dev-only control on a real page goes inside `DevOnly` (`src/components/DevOnly.tsx`), which gates on `devUi()` and draws the fuchsia `dev` tag and a dashed outline; `DevName` is the same mark for a component's name. `src/app/dev/layout.tsx`: the page gate (the overlays on real pages; `npm run dev:clean` sets `NEXT_PUBLIC_DEV_UI=off` to hide them).
- `registry.ts`: the tools listed on `/dev`.
- `model/models.ts`: the Claude models a run can use: the CLI aliases and the pinned `DEMO_MODELS`.
- `model/pricing.ts`, `model/personas.ts`, `model/compare.ts`, `compare/published.json`, `server/ollama.ts`, `scripts/compare-models.ts`, `scripts/publish-model-plans.ts`: comparing AI models from the command line.
- `src/app/api/dev/mcp`: the library tools (`features/library`) as a local MCP server, `POST /api/dev/mcp` (stateless, plain JSON; `GET` answers 405, production 404). `.mcp.json` at the repo root registers it as `musickit-library` for Claude Code, so the dev server must be running. It reads the database the dev server is configured with, which must have migration 0019 applied. Every tool also takes `player` (a user id) and `include_not_enabled` (also examples and plans not enabled for reuse); only this route and `/dev/library` read them, both through `devScope`.
- `model/assess.ts`, `server/assessments.ts`: plans judged against the judge model's own plan.
- `model/history.ts`: run records, summaries, ids, the pasted-reply check (`readRunInput`), `describeReply`.
- `model/compose.ts`: `composePrompt` (overrides on parts), answers from text, a past run as last week, the studio's saved state.
- `server/claude.ts`: `claudeArgs`, `childEnv`, `parseClaudeResult`, `runClaude`.
- `server/history.ts`: `saveRun`, `readRun`, `listRuns` over `tools/prompt-history/`.
- `model/preview.ts`: a seed item's JSON made parseable and parsed for display; `whyOf`.
- `model/copyNotes.ts`: the notes registry: shape, Markdown, re-pin, clear, section state, links, the old comments' migration.
- `model/comments.ts`: what section notes need from the plan model: hashes, `exampleSections`, `repinSectionNotes`.
- `server/git.ts`: `exampleCommits` (HEAD and the seed files' commits), for `GET /api/dev/commit`.
- `prompt/`: `PromptStudio` (state), `StudioInputs`, `PartList`, `PastePanel`, `PlanPreview`, `HistoryList`, `api.ts` (fetches), `storage.ts` (saved state, `useMounted`).
- `library/`: /dev/library: the tables, one item drawn, its section notes.
- `kickstarter/KickstarterPage.tsx`, `model/kickstarter.ts`: the founding-partner email brief for teachers; its facts, voice and samples. `kickstarter/StudentOfferPage.tsx`, `model/kickstarterStudents.ts`, `src/lib/studentOffer.ts`: the offer to students. `kickstarter/KickstarterNav.tsx`, `kickstarter/demos.ts`: the nav between the two and the pages each may link.
- `costs/CostsPage.tsx`: /dev/costs.
- `model/library.ts`, `scripts/db-seed-plans.ts`: the practice-plan library's seed.
- `costs/CostPerPlayer.tsx`, `model/unitEconomics.ts`: what one paying player costs a year on each AI model.
- `costs/PlanCosts.tsx`: the plans table with what a year on each costs and leaves (`planYear`).
- `costs/OpenRouterModels.tsx`, `model/openRouter.ts`: other OpenRouter models priced on Haiku 5.5's tokens.
- `structure/StructureView.tsx`, `model/structure.ts`, `server/structure.ts`, `scripts/structure.ts`: the code structure map.
- `progress/ProgressPage.tsx`: the progress outcome's inputs and outputs.
- `data/DataPage.tsx`, `model/dataView.ts`: the data page and its rows (`planRows`, `spentRows`, `logRows`).
- Routes: `src/app/api/dev/history`, `src/app/api/dev/history/[id]`; pages `src/app/dev`.
