# Library

Reads the library of practice plans and exercise blocks, for agents that ask for them by tool. It only reads: nothing here inserts, updates or deletes.

`seed/` holds the plans and exercises agents write for the library's gaps, one JSON file each; its `README.md` says how to add one. The seed scripts (`db:seed-plans`, `db:seed-blocks`) put them in the database.

## The scope

Every query takes a `Scope`, built by the server code that calls the module and never passed through from a model.

- `player`: the player asking. Their own blocks are visible; `mine` and the `player` filter are about them.
- `planIds`: when set, plan queries see only these ids.
- `includeNotEnabled`: also the app's blocks and plans that are not enabled for reuse.

A block is returned only when an owner row is `enabled_for_reuse`, or the player owns it, or the app owns it (`user_id` null) and `includeNotEnabled` is set. Another player's private block is never returned.

Other players appear only as totals (`use`: times, seconds, ratings by stars). No function returns another player's id or a single rating of theirs. Stars never order or filter blocks, except the player's own latest stars for `player: "repeat"`.

Plans have their own gate: enabled for reuse, or `includeNotEnabled`, and `scope.planIds` narrows them. A plan's schedule, counts, topics, concepts and filters come from its `practice_plan_blocks` rows whether or not each block is visible to the caller; only a schedule row's title follows the block's gate (the rule `getBlock` uses), and is "" when the caller cannot see the block. A library plan's rows name only blocks the app owns. `coverage` counts only blocks visible under the scope, and only pairs, concepts and steps with at least one; its `plans` counts visible plans with a block of that topic and level (or concept, or step). A block counts for a step only when it names it (`blocks.steps`, "trackId:n"); the `steps` filter matches a block that names any of them. A block stored before steps names none and is found by `level` alone.

`handleRpc` and `devTools` (in `mcp.ts`) build the scope from the tool arguments (`player`, `include_not_enabled`, through `devScope`). They are for the local dev route `/api/dev/mcp` only, never mounted elsewhere; `/dev/library` is the other caller of `devScope`.

## Files (`server/`)

- `types.ts`: `Scope`, `BlockSummary`, `BlockDetail`, `BlockFilter`, `BlockOrder`, `PlanSummary`, `PlanDetail`, `PlanFilter`, `CoverageRow`, `ConceptCoverage`.
- `repo.ts`: the `LibraryRepo` interface.
- `repo.memory.ts`: the repo over plain rows, the readable statement of the rules.
- `fixture.ts`: `LibraryData` (rows shaped like the tables in `src/lib/db/schema.ts`) and `baseFixture()`.
- `repo.drizzle.ts`: `drizzleLibraryRepo(db)`, the same rules in SQL. Every caller value is a bound parameter; player ids are compared as text, so an id that is not a UUID matches nothing.
- `testDatabase.ts`: `localTestDatabase(url)`, the guard of the Postgres test script (below).
- `repoContract.ts`: `libraryRepoContract(make)`, the tests every repo must pass; `repo.memory.test.ts` runs it on the memory repo.
- `query.ts`: `findBlocks`, `getBlock`, `findPlans`, `getPlan`, `libraryCoverage`, `playerProgress` over a `LibraryRepo` and a `UserDataRepo` (`Deps`). Limits clamp to 1..max (blocks 20/50, plans 10/30); `random-least-used` shuffles the least used fifth; coverage adds zero rows for every topic, level, concept and path step (steps in path order, `slope`); `playerProgress` builds the progress page's `outcome()` on the server from the player's own readers (`readDoc`, `readEntries`, `readAllPlanTimes`), returns at most 50 of the player's blocks with `blocksTotal` beside them, and is null without a player.
- `tools.ts`: `LIBRARY_TOOLS` (name, description, JSON schema) and `callTool`, which checks arguments by hand. `player`, `planIds`, `includeNotEnabled` and `include_not_enabled` in the arguments are ignored: the scope is the server's.
- `mcp.ts`: `handleRpc` (the MCP streamable HTTP messages: `initialize`, `ping`, `tools/list`, `tools/call`; stateless, plain JSON), `devTools()` (the tools with the two dev arguments added) and `devScope` (takes `player` and `include_not_enabled` out of the arguments and builds the `Scope`; the only place that reads them). A query that throws becomes a result with `isError` and the text "The library could not be read."; the error is logged with `console.error`.

## How an agent reaches the tools

`.mcp.json` at the repo root points Claude Code at `http://localhost:3000/api/dev/mcp` (server `musickit-library`), so the dev server must be running. It is local only: the route answers 404 in production. It reads the database the dev server is configured with (`DATABASE_URL`), which must have migration 0019 applied. Two extra arguments exist on every tool there and nowhere else: `player` (a user id that exists; puts that player in scope) and `include_not_enabled` (true also shows the app's examples and plans not enabled for reuse). Without them the scope is empty: only blocks and plans enabled for reuse.

## Testing against Postgres

`scripts/test-library-db.ts` runs the contract on `drizzleLibraryRepo`, and the block provenance cases of `userData/server/provenance.test.ts` on the Drizzle user data repo. It is not part of `npm test`:

```
LIBRARY_TEST_DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit_test npm run -s test:library-db
```

It refuses any database that is not on `localhost` or `127.0.0.1` with a name ending in `_test`, and any address with a query string or hash (postgres.js would take `?host=` from it) (`server/testDatabase.ts`, `localTestDatabase`); it connects by the checked parts only and hands the migrations a URL rebuilt from them. It drops and remakes that database's `public` schema, runs the migrations, and empties the tables before each test. It never reads `.env` or `.env.local`. Create the database once on the local server: `docker exec musickit-db psql -U musickit -d postgres -c "create database musickit_test"`.
