# Library

Reads the library of practice plans and exercise blocks, for agents that ask for them by tool. It only reads: nothing here inserts, updates or deletes.

## The scope

Every query takes a `Scope`, built by the server code that calls the module and never passed through from a model.

- `player`: the player asking. Their own blocks are visible; `mine` and the `player` filter are about them.
- `planIds`: when set, plan queries see only these ids.
- `includeNotEnabled`: also the app's blocks and plans that are not enabled for reuse.

A block is returned only when an owner row is `enabled_for_reuse`, or the player owns it, or the app owns it (`user_id` null) and `includeNotEnabled` is set. Another player's private block is never returned.

Other players appear only as totals (`use`: times, seconds, ratings by stars). No function returns another player's id or a single rating of theirs. Stars never order or filter blocks, except the player's own latest stars for `player: "repeat"`.

## Files (`server/`)

- `types.ts`: `Scope`, `BlockSummary`, `BlockDetail`, `BlockFilter`, `BlockOrder`, `PlanSummary`, `PlanDetail`, `PlanFilter`, `CoverageRow`, `ConceptCoverage`.
- `repo.ts`: the `LibraryRepo` interface.
- `repo.memory.ts`: the repo over plain rows, the readable statement of the rules.
- `fixture.ts`: `LibraryData` (rows shaped like the tables in `src/lib/db/schema.ts`) and `baseFixture()`.
- `repo.drizzle.ts`: `drizzleLibraryRepo(db)`, the same rules in SQL. Every caller value is a bound parameter; player ids are compared as text, so an id that is not a UUID matches nothing.
- `testDatabase.ts`: `localTestDatabase(url)`, the guard of the Postgres test script (below).
- `repoContract.ts`: `libraryRepoContract(make)`, the tests every repo must pass; `repo.memory.test.ts` runs it on the memory repo.
- `query.ts`: `findBlocks`, `getBlock`, `findPlans`, `getPlan`, `libraryCoverage`, `playerProgress` over a `LibraryRepo` and a `UserDataRepo` (`Deps`). Limits clamp to 1..max (blocks 20/50, plans 10/30); `random-least-used` shuffles the least used fifth; coverage adds zero rows for every topic, level and concept; `playerProgress` builds the progress page's `outcome()` on the server and is null without a player.
- `tools.ts`: `LIBRARY_TOOLS` (name, description, JSON schema) and `callTool`, which checks arguments by hand. `player`, `planIds`, `includeNotEnabled` and `include_not_enabled` in the arguments are ignored: the scope is the server's.

## Testing against Postgres

`scripts/test-library-db.ts` runs the contract on `drizzleLibraryRepo`, and the block provenance cases of `userData/server/provenance.test.ts` on the Drizzle user data repo. It is not part of `npm test`:

```
LIBRARY_TEST_DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit_test npm run -s test:library-db
```

It refuses any database that is not on `localhost` or `127.0.0.1` with a name ending in `_test`, and any address with a query string or hash (postgres.js would take `?host=` from it) (`server/testDatabase.ts`, `localTestDatabase`); it connects by the checked parts only and hands the migrations a URL rebuilt from them. It drops and remakes that database's `public` schema, runs the migrations, and empties the tables before each test. It never reads `.env` or `.env.local`. Create the database once on the local server: `docker exec musickit-db psql -U musickit -d postgres -c "create database musickit_test"`.

Plans have their own gate: enabled for reuse, or `includeNotEnabled`, and `scope.planIds` narrows them. A plan's schedule, counts, topics, concepts and filters come from its `practice_plan_blocks` rows whether or not each block is visible to the caller. `coverage` counts only blocks visible under the scope, and only pairs and concepts with at least one; its `plans` counts visible plans with a block of that topic and level (or concept).
