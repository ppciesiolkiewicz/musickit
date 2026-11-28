# Library

Reads the library of exercise blocks, for agents that ask for them by tool. There is no plan library: the seed plans stay files (`seed/plans`, `SEED_PLANS`), read by /demo, /admin/content/library and tests, and never stored. It only reads: nothing here inserts, updates or deletes.

`seed/` holds the plans and exercises agents write for the library's gaps, one JSON file each; its `README.md` says how to add one. `db:seed-blocks` puts the blocks in the database; the plans are not stored.

## The scope

Every query takes a `Scope`, built by the server code that calls the module and never passed through from a model.

- `player`: the player asking. Their own blocks are visible; `mine` and the `player` filter are about them.
- `includeNotEnabled` (dev): also inactive choices, curated blocks with no active choice, and the app's hashed blocks (old examples and AI rows).

A block is curated (`blocks.kind` 'curated': a seed block with a fixed id, its level, steps, minutes and moves on its `choices`) or hashed (its id the hash of its content: a player's edit, an old AI or example block). A curated block is returned while one of its choices is `active`; a hashed block only to a player who owns it (`block_owners`), or with `includeNotEnabled` when the app owns it (`user_id` null). The player's own blocks are always returned. Another player's private block is never returned. There is no reuse flag on blocks: a choice's `active`, set by the seed, is the only switch. A block's `revision` (`blocks.revision`) says how many times the seed has written it: 1 at first, one more each time `db:seed-blocks` finds its file changed; no query here returns it yet.

A curated block's summary and detail carry `choices` (id, name, level, steps, moves (null when none), `set` (only when the choice sets tool props or params, `plan/model/choiceSet.ts`), minutes, active; by place): its active choices, all of them with `includeNotEnabled`; a hashed block's are `[]`. Its `level` is the first listed choice's and its `steps` are the listed choices' steps together; the `level` and `steps` filters match through any listed choice. `use` and `mine` on a block count all its choices together (timers and ratings by block id).

Other players appear only as totals (`use`: times, seconds, ratings by stars). No function returns another player's id or a single rating of theirs. Stars never order or filter blocks, except the player's own latest stars for `player: "repeat"`.

`coverage` counts only blocks visible under the scope, and only pairs, concepts and steps with at least one. A block counts for a step only when it names it (a hashed block's `blocks.steps`, a curated block's listed choices' `steps`, "trackId:n"); a curated block counts once per listed choice in a topic-and-level or step row (its time and seconds once). The `steps` filter matches a block that (or one of whose listed choices) names any of them. A block stored before steps names none and is found by `level` alone.

`handleRpc` and `devTools` (in `mcp.ts`) build the scope from the tool arguments (`player`, `include_not_enabled`, through `devScope`). They are for the local dev route `/api/dev/mcp` only, never mounted elsewhere; `/admin/content/library` is the other caller of `devScope`.

## Files (`server/`)

- `types.ts`: `Scope`, `BlockChoice`, `BlockSummary`, `BlockDetail` (with `slot`, a block's default minutes, why and lessons, or null), `BlockSlot`, `BlockFilter`, `BlockOrder`, `CoverageRow`, `ConceptCoverage`, `StepCoverage`.
- `repo.ts`: the `LibraryRepo` interface.
- `repo.memory.ts`: the repo over plain rows, the readable statement of the rules.
- `fixture.ts`: `LibraryData` (rows shaped like the tables in `src/lib/db/schema.ts`, `choices` included), `baseFixture()`, and `curatedBlock` and `choice` for tests that add their own.
- `repo.drizzle.ts`: `drizzleLibraryRepo(db)`, the same rules in SQL. Every caller value is a bound parameter; player ids are compared as text, so an id that is not a UUID matches nothing.
- `testDatabase.ts`: `localTestDatabase(url)`, the guard of the Postgres test script (below).
- `repoContract.ts`: `libraryRepoContract(make)`, the tests every repo must pass; `repo.memory.test.ts` runs it on the memory repo.
- `composeBlocks(player, areas)` (on the repo, not in `query.ts`): what a day's plan can be made from, for the plan composer: one `ComposeBlock` per active choice of a curated block in one of the areas, where the choice names at least one step, or the block is a warm-up (`content.kind` "warm-up", DayShape2: it names none and the composer picks it by its kind). A hashed block is never listed. Each has the block's id, content and fields with the choice's `choiceId`, `level`, `steps`, minutes (`slot.minutes`; why and lessons are the block's) and `moves` (in `content.moves`), the content drawn with the choice's set (`applyChoiceSet`: its tool props and params); `use` (times and seconds of every player on the block, all its choices together, summed for these blocks only) and `mine` (the player's newest rating by `at` among rows with that `choice_id`, null when none). By block id, then choice place; no limit.
- `query.ts`: `findBlocks`, `getBlock`, `libraryCoverage`, `playerProgress` over a `LibraryRepo` and a `UserDataRepo` (`Deps`). Limits clamp to 1..max (blocks 20/50); `random-least-used` shuffles the least used fifth; coverage adds zero rows for every topic, level, concept and path step (steps in path order, `slope`); `playerProgress` builds the progress page's `outcome()` on the server from the player's own readers (`readDoc`, every plan of it: current, history and given; `readEntries`, `readAllPlanTimes`), returns at most 50 of the player's blocks with `blocksTotal` beside them, and is null without a player.
- `tools.ts`: `LIBRARY_TOOLS` (name, description, JSON schema) and `callTool`, which checks arguments by hand. `player`, `includeNotEnabled` and `include_not_enabled` in the arguments are ignored: the scope is the server's.
- `mcp.ts`: `handleRpc` (the MCP streamable HTTP messages: `initialize`, `ping`, `tools/list`, `tools/call`; stateless, plain JSON), `devTools()` (the tools with the two dev arguments added) and `devScope` (takes `player` and `include_not_enabled` out of the arguments and builds the `Scope`; the only place that reads them). A query that throws becomes a result with `isError` and the text "The library could not be read."; the error is logged with `console.error`.

## How an agent reaches the tools

`.mcp.json` at the repo root points Claude Code at `http://localhost:3000/api/dev/mcp` (server `musickit-library`), so the dev server must be running. It is local only: the route answers 404 in production. It reads the database the dev server is configured with (`DATABASE_URL`), which must have every migration up to 0039 applied. Two extra arguments exist on every tool there and nowhere else: `player` (a user id that exists; puts that player in scope) and `include_not_enabled` (true also shows inactive choices and the app's old example and AI blocks). Without them the scope is empty: curated blocks with an active choice.

## Testing against Postgres

`scripts/test-library-db.ts` runs the contract on `drizzleLibraryRepo`, and the block provenance cases of `userData/server/provenance.test.ts` on the Drizzle user data repo. It is not part of `npm test`:

```
LIBRARY_TEST_DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit_test npm run -s test:library-db
```

It refuses any database that is not on `localhost` or `127.0.0.1` with a name ending in `_test`, and any address with a query string or hash (postgres.js would take `?host=` from it) (`server/testDatabase.ts`, `localTestDatabase`); it connects by the checked parts only and hands the migrations a URL rebuilt from them. It drops and remakes that database's `public` schema, runs the migrations, and empties the tables before each test. It never reads `.env` or `.env.local`. Create the database once on the local server: `docker exec musickit-db psql -U musickit -d postgres -c "create database musickit_test"`.
