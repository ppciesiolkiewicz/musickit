# Querying the library: blocks and plans, through tools (design)

Status: draft, for approval.

## Why

The library holds whole plans (`practice_plans`) and blocks (`blocks`, `block_owners`), and progress is already kept per
block (`progress_entries.block_id`, `plan_day_times.blocks`). Nothing can ask the library a question. Three things are
coming that all need to:

- **Seeding** (next): agents write more plans. They should first see what the library covers, which topics and levels
  are thin, and what is already there, instead of writing the same thing twice.
- **Autoplans on the server** (NEW7 in `tasks.txt`): layers that decide between reuse and writing. A whole plan that
  fits the player and that they haven't had is used as it is. Otherwise an AI writes a plan, searching blocks through
  tools: blocks the player hasn't had when they want new things, the blocks they had when they want the same again.
  The plan examples then leave the writer's prompt; the player's progress and the blocks they used take their place.
- **Devtools**: looking at the library by hand.

The user also wants to know, for every block, **which model wrote it and to which version of the rules**, so the
library can be judged and filtered by where it came from.

This design is the query and the provenance. It comes first; the questionnaire rework, the seeding run and the autoplan
server are their own projects and build on it.

## What the user decided

- Blocks are the basic unit to query. Whole plans can be queried too.
- A good match of a whole plan to the player's answers and current level means the whole plan is used. Players keep
  getting plans they haven't had.
- "Current level" comes from the player's previous replies (their stars per block), not only the first questionnaire.
- The AI searches blocks, through tools. The tools must be able to give blocks the player hasn't had, and the blocks
  they had.
- Use of a block is **how many times it was practised and the time spent on it, over all players**. Not how many
  players have it. Progress per block is already tracked; this only adds it up.
- Model and version are kept in the database per block.
- The library should get even use: least-used blocks first, or random among the least used.

## What exists (read before planning)

- `src/lib/db/schema.ts`: `practice_plans` (id, title, answers, model, reply, source, enabled_for_reuse), `blocks`
  (hash id, content, area, topic, concepts, level, tags, parent_id; insert-only), `block_owners` (user or the app,
  source `ai | edit | seed | example`, enabled_for_reuse), `progress_entries` (one row per rated slot, `block_id`, the
  entry with stars), `plan_day_times` (`spent` seconds by slot id, `blocks` slot id → block id), `plan_reviews`.
- `src/features/userData/server/`: the repo (`repo.ts`, `repo.drizzle.ts`) and `seedBlocks.ts`; `scripts/db-seed-plans.ts`
  and `scripts/db-seed-blocks.ts`.
- Stars say how the player is doing, not how good the block is (`features/progress/stars.ts`: 1 Can't do it yet …
  3 Same again next time … 5 Easy now). The only quality signal is `plan_reviews`, per whole plan.
- The outcome per concept, topic and area: `features/plan/model/outcome.ts` and `features/progress`.
- Versions: `PROMPT_VERSION` (`features/plan/model/prompt.ts`) for what the AI plan prompt asks for; `DOC_VERSIONS`
  (`agents`, `teaching`) for hand-tuned examples (`features/plan/examples/index.ts`).
- The only tools today are the browser's (WebMCP, `src/lib/webmcp.ts`, `features/plan/ui/use*AgentTools.ts`). There is
  no server-side MCP and no MCP dependency.
- Local-only dev routes live in `src/app/api/dev` and `src/app/dev`; production answers 404.

## Goals

1. Every block and every library plan records the model that wrote it and the version of the rules it was written to.
2. One server module that answers questions about the library, with the bounds set by the server (what may be reused,
   whose progress may be read).
3. That module offered as MCP tools to the seeding agents and devtools, on the local machine.
4. The same module ready to be called by the autoplan server later with the player fixed by the server, without
   changing the queries.

## Non-goals

- The autoplan server itself: the shortlist, the assess step, the writer, which model, caching, allowances.
- Removing the examples from the prompt, or any change to the prompt or `PROMPT_VERSION`.
- Writing to the library through the tools. The tools only read; plans and blocks get in by the seed scripts and by a
  plan save, as today.
- The browser's AI (WebMCP) querying the library. A player's own AI gets no library access in this work.
- A quality rating for blocks. Stars are not one.
- Assembling a plan from blocks in code.

## Anti-goals

- A tool call returning a block that is not enabled for reuse and not the asking player's own. A player's edited or
  pasted blocks stay private.
- Any other player's identity or single ratings leaving the module. Other players only ever appear as totals.
- The caller choosing the player. Where a player is given, the server gives it; a tool argument never widens it. (The
  local dev endpoint may take a player id as an argument, because it is local and for the team.)
- Stars used to rank blocks as good or bad.
- The endpoint reachable in production.

## The design

### Provenance: model and version

On `blocks`, three nullable columns: `model` (the model id, as `practice_plans.model` holds it), and the version it was
written to. A block is written either by the plan prompt (then the version is `PROMPT_VERSION`) or by hand-tuned
seeding to the documents (then it is the `agents` and `teaching` pair). *My call:* store both kinds, each nullable
(`prompt_version`, `docs_agents`, `docs_teaching`, integers), instead of one free text, so they can be filtered. Column
names are the builder's.

- `practice_plans` gets the same version columns; it already has `model`.
- Seeded blocks take the model and version of the plan they come from. Example blocks take the example's `model` and
  `docs`.
- A block from a player's paste has no known model: all null. A block the autoplan server writes will carry its model
  and the prompt version (that project fills it in).
- An edited block keeps the model and version of its parent, and stays told apart by its owner row's source, `edit`.
  *My call.*
- Provenance is not part of the block id. The same content from two models is one row; it keeps the first known
  provenance. Rows stay insert-only for content and tags; the one exception is filling provenance where it is null
  (*my call*, so the existing rows can be filled by running the seed again). The data is prelaunch and may be reset,
  but only when the user says so.
- The published compare-models plans don't record a prompt version. If the run's files don't give one, it stays null.

### Which blocks a plan has

*My call:* a new table linking a library plan to its blocks in order (plan id, day, place in the day, block id),
written by the seed when it parses the reply. It lets a query say what a plan covers and how much of it a player
already had, without parsing replies on every call.

### What "had" and "use" mean

- A player **had** a block when they have a `block_owners` row for it. A player **had** a library plan when they had
  most of its blocks; the query returns the share, and the caller decides (the autoplan project sets the line).
- A block's **use** over all players: `times`, the number of plan-day records in which the block has seconds, and
  `seconds`, their sum (both from `plan_day_times`); `rated`, the number of ratings, and how many at each star (from
  `progress_entries`). Totals only. *My call:* worked out at query time; a kept running total is for later, if it gets
  slow.
- For a given player, per block they had: their latest stars and date, their times and seconds.

### The query module

One server module (suggested `src/features/library/server`, with a `README.md`; its place is the builder's call). No
HTTP in it. Every function takes a scope the server builds, never the caller (*my call* on its contents):

- `player`: whose progress and private blocks may be read, if anyone's.
- `planIds`: an optional allow-list of library plans. When set, plan queries see only those. The autoplan server will
  put its shortlist here, so its model can't widen the search; this work only has to honour it.
- `includeNotEnabled`: app-owned rows that are not enabled for reuse (examples, plans not yet switched on). Set only by
  the local dev endpoint. It never adds a player's private blocks; those show only for the player in scope.

**Where the queries run** (*my call*): the totals and filters are SQL, behind new methods on the repo
(`repo.drizzle.ts`), with a matching `repo.memory.ts` so the module's logic is tested in `npm test` as the repo's tests
are today (they use the memory repo, not a database). Because the reuse bounds, the privacy rule and the least-used
order live in that SQL, there is also a small test run against a real Postgres: its own script, not part of `npm test`,
run on the local Docker database only, and refusing to run unless its database URL is a local one (`.env.local` may
point at Supabase).

- **find blocks**: by area, topic, concepts, level, tags, model, version; for a player, one of `unused` (not had),
  `had`, or `repeat` (had, latest stars 1 to 3); order `least-used` (default), `random-least-used` (random among the
  least used), or `newest`; a limit with a low cap. Returns summaries: id, title, area, topic, concepts, level, tags,
  model, version, use. Not the content.
- **get block**: one block with content, provenance, use, and the player's own history with it when a player is in
  scope.
- **find plans**: by areas, levels, topics covered, model, version; for a player, the share already had. Returns
  summaries: id, title, the answers it was written for, model, version, days, minutes, the topics and concepts it
  covers with counts, its plan-review stars (count and mean; this is the quality signal), and the share had.
- **get plan**: one plan: its days as block ids with titles and minutes, and the reply when asked for.
- **coverage**: per topic and level (and per concept), how many reusable blocks and plans the library has and their
  total use. This is what a seeding agent reads first to find the gaps.
- **player progress**: for the player in scope, the outcome per topic and concept (from the existing outcome
  function) and the blocks they had with their latest stars. This is "current level" for the writer.

Only blocks with a reuse-enabled owner row, or owned by the player in scope, are ever returned. Only plans
`enabled_for_reuse` are returned. On the local dev endpoint a flag sets `includeNotEnabled`, since the team needs to
see examples and plans not yet switched on.

Smaller calls, mine: minutes per exercise are kept on the plan-blocks rows (a block holds no minutes); a block's
provenance is filled only when all of it is null; coverage lists every topic of the catalogue, also those with no
blocks; the migration takes the next free number after whatever lands first (`drizzle/0017_…` from other work is in
the tree, uncommitted).

### The tools

A local MCP endpoint over the module, for Claude Code agents and devtools: one tool per function above, named plainly
(`find_blocks`, `get_block`, `find_plans`, `get_plan`, `library_coverage`, `player_progress`), each with a JSON schema
and a description that says what the answer is for. It reads the database at `DATABASE_URL`.

- Local only, like the other `/api/dev` routes; production answers 404.
- Registered for the repo so agents get it without setup (`.mcp.json`).
- *My call:* served by the dev server over HTTP, so there is one process and one way to reach the database. Whether to
  use the MCP SDK or answer the few JSON-RPC methods by hand is the builder's.
- A bare `/dev` page that runs the same functions and shows the answers as tables (coverage first), no charts.

Later, the autoplan server calls the module directly and offers a subset of the same tool definitions to its model,
with the player in the scope set from the session. Nothing in this work depends on that.

## Order of work

1. Provenance columns and the plan-blocks table, one migration; the seed fills them; tests.
2. The query module: repo methods (SQL and memory), tests in `npm test`, and the local-Postgres test script.
3. The MCP endpoint, `.mcp.json`, the `/dev` page.

Then, as their own projects: rework the questionnaire; seed more plans with agents, using `library_coverage` to choose
what to write; NEW7.

## Left to the builder

- Table, column and index names; where the module lives.
- The exact shape of each tool's arguments and answers, within what is listed above; the caps.
- How `random-least-used` picks (for example, random among the lowest fifth).
- SDK or hand-written JSON-RPC; the route path.
- Keeping `docs/db` (the schema diagram) and the READMEs true in the same commits.
