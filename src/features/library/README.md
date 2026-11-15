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

- `types.ts`: `Scope`, `BlockSummary`, `BlockDetail`, `BlockFilter`, `BlockOrder`.
- `repo.ts`: the `LibraryRepo` interface.
- `repo.memory.ts`: the repo over plain rows, the readable statement of the rules.
- `fixture.ts`: `LibraryData` (rows shaped like the tables in `src/lib/db/schema.ts`) and `baseFixture()`.
- `repoContract.ts`: `libraryRepoContract(make)`, the tests every repo must pass; `repo.memory.test.ts` runs it on the memory repo.

Plans and coverage come next; `LibraryData` already has their rows.
