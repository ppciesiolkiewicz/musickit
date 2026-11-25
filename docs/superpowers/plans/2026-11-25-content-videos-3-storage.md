# ContentVideos3: content video storage and the lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A content video can be saved (file in the private Blob store, row in `content_videos`) for a tool at the
steps ticked, or for one tool cell of one curated block; one lookup says which video each tool cell of a block shows;
the riff maker's Take panel saves its take there. No page shows a video to players yet (ContentVideos4 and 5).

**Architecture:** A new feature, `src/features/contentVideos`, beside `src/features/videos` (players' takes) and sharing
only its pure upload rules and its Range streaming. `model/` is pure: which tool and step a cell is (`slot.ts`, over
`LADDERS`) and which video it shows (`lookup.ts`). `server/` has the rules, a `ContentVideoRepo` (memory and Drizzle,
one contract for both) and the access functions the routes in `src/app/api/content-videos` call. The step assignment
lives on the video row (`tool`, `steps`); a block's own video lives in `blocks.videos`, which the seed never writes.

**Tech Stack:** Next.js 16.4 route handlers (read `node_modules/next/dist/docs/01-app` on route handlers before
writing one), Drizzle + Postgres, `@vercel/blob` (`handleUpload`, `head`, `get`, `del`), `node:test` via
`npx tsx --test` (on this machine `npx tsx` hangs: use the cached binary, `ls ~/.npm/_npx/*/node_modules/.bin/tsx`).

**Spec:** `docs/superpowers/specs/2026-11-25-content-videos-design.md`, §3 (storage, second pass) and the `blocks.videos`
rule of §5. Task line: `tasks.txt` "ContentVideos3". Not in this plan: the video icon in a plan (ContentVideos4), the
Tools videos page, the Record page, the library strip, **Change steps** and the overlay data (ContentVideos5), riffs
edited in the app (ContentVideos11). Previous plans: `docs/superpowers/plans/2026-11-25-content-videos-{1-permissions,2-admin-split}.md`.

## Global Constraints

- A video covers the steps ticked when it is saved. A step is stored `<ladder id>:<key>` (`picking-drill:beginner`,
  `chord-changes:1`); `none` is **No level** (a laddered tool's cells with no readable step); `steps` is null for a
  tool with no ladder. There is no any-step video and no borrowing from the nearest step.
- One video per tool and step: saving takes the ticked steps off the tool's other videos in the same transaction. A
  video left with no steps keeps its row and file, with `tool` and `steps` null.
- `guitar-play-along` is one tool per shape: the key is `guitar-play-along:<shape>`. Every other tool's key is its type.
- A block's own video is addressed by the cell's index among the block's tool cells, flattened in reading order
  (cells inside a `section` included). Only curated blocks have one.
- No links table. `videos`, `VIDEO_LIBRARY` and the `video` tool are left alone.
- Path: `content/videos/<made_for>/<id>.<webm|mp4>`; `made_for` is `tool:<tool key>` or the block id **(call:** the
  spec's table also writes `riff:<block id>` for the riff maker; its path example is the plain block id, used here).
- Saving needs the `content` permission and a signed-in account (`recorded_by`), in development too. Watching and the
  lookup need no session.
- Every fetch has a timeout and every failure shows on the page. The one exception is the file transfer itself (up to
  1 GB): it has no timeout and shows **Uploading…** while it runs **(call)**.
- Interface copy (the Take panel, every `error` a route sends): load `design:ux-copy` and "Words about the app" in
  `teaching-voice` first; report strings old → new. No exclamation marks. Copy below is a draft for that pass.
- **Database:** `.env.local`'s `DATABASE_URL` may be Supabase. Before `npm run db:migrate`, print its host; migrate
  only `localhost` (`docker start musickit-db`). Never migrate or reset another database without asking.
- **Commits:** on main with `scripts/commit.sh "message" <paths>`, naming only your files. Never `git add`,
  `git commit`, `git stash` in the main checkout. `tasks.txt` and `.env.e2e` have another session's changes: leave
  `.env.e2e`; in `tasks.txt` touch only the ContentVideos lines. Messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done means: the tests named in each task, `npx tsc --noEmit 2>&1 | grep -v '^.next/'` clean, eslint on changed
  files, and Task 9's walk. `README.md` and `CLAUDE.md` of a touched feature are kept true in the same commit.

## Review Focus

1. **Two people save a video for the same tool and step at the same moment:** the step ends on exactly one video,
   never two and never none. → Task 4 contract test `two saves at once leave each step on one video` (it only bites on
   Postgres: run `test:library-db`).
2. **The file uploaded but saving the row failed** (connection lost, tab closed): pressing save again writes the row
   without sending the file again, and the take is still in the browser. → Task 8 tests `a take whose file is up only
   retries the row` and `a failed transfer tries the row once`.
3. **A seed edit moves or swaps the tools of a block that has its own video:** the entry is dropped and printed, the
   video row stays, and the video never shows on a different tool. → Task 5 tests.
4. **The lookup asked by a signed-out visitor with junk, a huge body, an unknown block id or no database:** 400 or an
   empty answer, never a 500, and never another block's own video. → Task 7 tests.
5. **Deleting a video something still points at:** refused with what points at it; a video left with no steps (tool
   null) and no cell deletes. → Task 4 test `remove is refused while pointed at` and Task 6 `delete names what points at it`.

Still to check by hand against the real store (Task 9): that a path with a colon (`content/videos/tool:picking-drill/…`)
uploads, is found by `head` and streams.

---

### Task 1: Which tool and step a cell is

**Files:**
- Create: `src/features/contentVideos/model/slot.ts`, `src/features/contentVideos/model/slot.test.ts`
- Modify: `src/features/exercises/shapes/index.ts` (export the shape names), `package.json` (`test`: add
  `src/features/contentVideos/*/*.test.ts`)

**Interfaces:**
- Consumes: `LADDERS` (`@/features/plan/model/ladders`), `TOOLS`, `PlanTool`, `Cell` (`@/features/plan/model/tools`).
- Produces:
  - `SHAPE_NAMES: string[]` from `shapes/index.ts` (`Object.keys(SHAPES)`).
  - `NO_LEVEL = "none"`
  - `TOOL_LADDERS: Record<string, readonly string[]>`: tool key → its ladder ids, in the order they are tried.
  - `toolKeyOf(tool: PlanTool): string`
  - `isToolKey(key: string): boolean`: a `TOOLS` name other than `guitar-play-along`, or `guitar-play-along:<a SHAPE_NAMES name>`.
  - `stepsOfTool(key: string): string[] | null`: every `<ladder id>:<key>` of its ladders in ladder order, then `"none"`; null with no ladder.
  - `stepOf(tool: PlanTool): string | null`: the first of its ladders whose `read` gives a key, as `<ladder id>:<key>`; `"none"` when it has ladders and none reads; null with no ladder.
  - `toolCells(cells: Cell[]): PlanTool[]`: the tools in reading order, a section's cells in its place.
  - `interface CellAsk { cell: number; tool: string; step: string | null }`, `asksOf(cells: Cell[]): CellAsk[]`

- [ ] **Step 1: Write the failing tests** (`slot.test.ts`). Build tools with `TOOLS[name].parse({...})` so they are real `PlanTool`s.

```ts
test("a play-along is one tool per shape", () => {
  assert.equal(toolKeyOf(playAlong({ shape: "chord-steps", ... })), "guitar-play-along:chord-steps");
  assert.equal(toolKeyOf(pickingDrill("beginner")), "picking-drill");
  assert.equal(isToolKey("guitar-play-along"), false);
  assert.equal(isToolKey("guitar-play-along:riff"), true);
  assert.equal(isToolKey("guitar-play-along:nonsense"), false);
  assert.equal(isToolKey("picking-drill"), true);
});
test("a step is the ladder's id and the step's key", () => {
  assert.equal(stepOf(pickingDrill("beginner")), "picking-drill:beginner");
  assert.equal(stepOf(ears("level=1")), "interval-ears:1");
  assert.equal(stepOf(ears("kind=change&level=1")), "chord-changes:1");
});
test("a laddered tool with no readable step is No level", () => {
  // a clap-along with its own pattern beside the level; breathwork that is not farinelli
  assert.equal(stepOf(clapAlongWithOwnPattern), "none");
  assert.equal(stepOf(breathworkOtherDrill), "none");
});
test("a tool with no ladder has no step", () => {
  assert.equal(stepOf(backingBand), null);
  assert.equal(stepsOfTool("scale-neck"), null);
  assert.equal(stepsOfTool("guitar-play-along:chord-steps"), null);
});
test("a tool's steps are its ladders' in order, then No level", () => {
  assert.deepEqual(stepsOfTool("picking-drill"), ["picking-drill:new", "picking-drill:beginner", "picking-drill:intermediate", "picking-drill:advanced", "none"]);
  const ears = stepsOfTool("interval-ears")!;
  assert.equal(ears[0], "interval-ears:1");
  assert.ok(ears.includes("chord-changes:1"));
  assert.equal(ears.at(-1), "none");
});
test("every ladder that reads a tool belongs to exactly one tool", () => {
  const listed = Object.values(TOOL_LADDERS).flat();
  assert.deepEqual([...listed].sort(), LADDERS.filter((l) => l.read).map((l) => l.id).sort());
  for (const key of Object.keys(TOOL_LADDERS)) assert.ok(isToolKey(key), key);
});
test("tool cells count through sections", () => {
  // [text, tool A, section[text, tool B, tool C], tool D] → asks 0..3 with A, B, C, D's keys and steps
});
```

- [ ] **Step 2: Run** `npx tsx --test src/features/contentVideos/model/slot.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `slot.ts`.** `TOOL_LADDERS` is written out, since a ladder doesn't name its tool:

```ts
export const TOOL_LADDERS: Record<string, readonly string[]> = {
  "interval-singer": ["interval-singer"], "interval-ears": ["interval-ears", "chord-changes"],
  "note-finder": ["note-finder"], "string-singer": ["string-singer"], breathwork: ["farinelli"],
  "finger-pattern": ["finger-pattern"], "picking-drill": ["picking-drill"], "legato-trill": ["legato-trill"],
  "clap-along": ["clap-along"], "double-stops-neck": ["double-stops-neck"], "staff-reading": ["staff-reading"],
  "vowel-guide": ["vowel-guide"], "song-chart": ["song-chart"],
  "guitar-play-along:interval": ["intervals-on-neck"], "guitar-play-along:melody": ["guitar-tunes"],
  "melody-singer": ["melody-stages"], "run-singer": ["run-stages"],
};
```

  `melody-difficulty` has no `read` and is no tool's. Steps come from `LADDERS` only; nothing here restates one.

- [ ] **Step 4: Run** the test file. Expected: PASS. Also `npx tsx --test src/features/exercises/shapes/*.test.ts`.

- [ ] **Step 5: Commit** `feat(content-videos): which tool and step a cell is`.

### Task 2: Which video a cell shows

**Files:**
- Create: `src/features/contentVideos/model/lookup.ts`, `src/features/contentVideos/model/lookup.test.ts`

**Interfaces:**
- Consumes: `CellAsk` (Task 1).
- Produces:
  - `interface ToolVideo { id: string; tool: string | null; steps: string[] | null }`
  - `videoFor(ask: CellAsk, own: Record<number, string>, rows: ToolVideo[]): { id: string; from: "block" | "tool" } | null`
  - `firstShown(ids: (string | null)[]): boolean[]`: true at the first place of each id, false at a repeat and at null. ContentVideos4 runs it over a day.
  - `interface CellVideo { cell: number; id: string; from: "block" | "tool"; repeat: boolean }`
  - `blockVideos(asks: CellAsk[], own: Record<number, string>, rows: ToolVideo[]): CellVideo[]`: one per cell that has a video; `repeat` when the same video showed at an earlier cell.

- [ ] **Step 1: Write the failing tests.**

```ts
const every = { id: "v-all", tool: "picking-drill", steps: ["picking-drill:new", "picking-drill:intermediate", "picking-drill:advanced", "none"] };
const beginner = { id: "v-beg", tool: "picking-drill", steps: ["picking-drill:beginner"] };
const band = { id: "v-band", tool: "backing-band", steps: null };
const ask = (cell: number, tool: string, step: string | null) => ({ cell, tool, step });

test("the block's own video wins", () => assert.deepEqual(videoFor(ask(1, "picking-drill", "picking-drill:beginner"), { 1: "v-own" }, [beginner]), { id: "v-own", from: "block" }));
test("the tool's video holding the step", () => assert.deepEqual(videoFor(ask(0, "picking-drill", "picking-drill:beginner"), {}, [every, beginner]), { id: "v-beg", from: "tool" }));
test("No level uses the video holding none", () => assert.equal(videoFor(ask(0, "picking-drill", "none"), {}, [every, beginner])?.id, "v-all"));
test("a step no video holds shows nothing: no borrowing", () => assert.equal(videoFor(ask(0, "picking-drill", "picking-drill:beginner"), {}, [every]), null));
test("a tool with no ladder uses its video with null steps", () => assert.equal(videoFor(ask(0, "backing-band", null), {}, [band])?.id, "v-band"));
test("null steps never match a step, and steps never match a tool with none", () => {
  assert.equal(videoFor(ask(0, "backing-band", "none"), {}, [band]), null);
  assert.equal(videoFor(ask(0, "picking-drill", null), {}, [every]), null);
});
test("a video with no tool shows nowhere", () => assert.equal(videoFor(ask(0, "picking-drill", "none"), {}, [{ id: "x", tool: null, steps: null }]), null));
test("a block shows each video once, by video and not by tool", () => {
  const asks = [ask(0, "picking-drill", "picking-drill:new"), ask(1, "picking-drill", "picking-drill:advanced"), ask(2, "picking-drill", "picking-drill:beginner")];
  assert.deepEqual(blockVideos(asks, {}, [every, beginner]).map((v) => [v.cell, v.id, v.repeat]), [[0, "v-all", false], [1, "v-all", true], [2, "v-beg", false]]);
});
test("firstShown", () => assert.deepEqual(firstShown(["a", null, "a", "b"]), [true, false, false, true]));
```

- [ ] **Step 2: Run** the file. Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(content-videos): which video a tool cell shows`.

### Task 3: The table, `blocks.videos` and the rules

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0046_content_videos.sql` (by `npm run db:generate`; rename the generated file to this)
- Create: `src/features/contentVideos/server/rules.ts`, `src/features/contentVideos/server/rules.test.ts`

**Interfaces:**
- Produces:
  - Table `contentVideos` (`content_videos`), `.enableRLS()`: `id` uuid pk (no default: the browser's), `title` text
    not null, `note` text not null default `''`, `recordedBy` uuid → users `on delete set null`, `madeFor` text not
    null, `tool` text null, `steps` text[] null, `type`, `seconds`, `width`, `height`, `size` as `videos`,
    `blobPath` text not null unique, `overlay` jsonb null, `createdAt`. Index `content_videos_tool_idx` on `tool`.
  - `blocks.videos`: `jsonb("videos").$type<BlockVideos>()`, null; `type BlockVideos = { cells?: Record<string, string> }` exported from `rules.ts`.
  - `contentVideoPath(madeFor: string, id: string, type: string): string`
  - `isMadeFor(v: unknown): v is string`: `tool:<a tool key>` (checked with `isToolKey`) or a block id (`^[a-z0-9][a-z0-9-]{0,199}$`).
  - `type Target = { kind: "tool"; tool: string; steps: string[] | null } | { kind: "cell"; blockId: string; cell: number }`
  - `readTarget(raw: unknown, madeFor: string): Target | null`
  - `cleanNote(v: unknown): string` (trimmed, 1000 characters at most).

- [ ] **Step 1: Write the failing tests** (`rules.test.ts`).

```ts
const ID = "3f9c2a10-0000-4000-8000-000000000001";
test("the path names where it was made", () => {
  assert.equal(contentVideoPath("tool:picking-drill", ID, "video/webm;codecs=vp9,opus"), `content/videos/tool:picking-drill/${ID}.webm`);
  assert.equal(contentVideoPath("guitar-beginner-blues-boogie-pattern-in-a", ID, "video/mp4"), `content/videos/guitar-beginner-blues-boogie-pattern-in-a/${ID}.mp4`);
});
test("made_for is a tool or a block id, nothing with a slash or dots", () => {
  for (const ok of ["tool:picking-drill", "tool:guitar-play-along:riff", "guitar-beginner-x"]) assert.equal(isMadeFor(ok), true, ok);
  for (const bad of ["tool:nonsense", "tool:guitar-play-along", "../x", "a/b", "", "A", 3]) assert.equal(isMadeFor(bad), false, String(bad));
});
test("a tool target ticks steps of that tool", () => {
  assert.deepEqual(readTarget({ kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner", "none"] }, "tool:picking-drill"), { kind: "tool", tool: "picking-drill", steps: ["picking-drill:beginner", "none"] });
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: [] }, "tool:picking-drill"), null);             // nothing ticked
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: null }, "tool:picking-drill"), null);           // a laddered tool needs steps
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["note-finder:new"] }, "tool:picking-drill"), null); // another tool's step
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["none", "none"] }, "tool:picking-drill"), null);
  assert.equal(readTarget({ kind: "tool", tool: "picking-drill", steps: ["none"] }, "tool:note-finder"), null);          // made somewhere else
});
test("a tool with no ladder takes null steps only", () => {
  assert.deepEqual(readTarget({ kind: "tool", tool: "backing-band", steps: null }, "tool:backing-band"), { kind: "tool", tool: "backing-band", steps: null });
  assert.equal(readTarget({ kind: "tool", tool: "backing-band", steps: ["none"] }, "tool:backing-band"), null);
});
test("a cell target is a block and a whole index under MAX_CELLS", () => {
  assert.deepEqual(readTarget({ kind: "cell", blockId: "riff-x", cell: 0 }, "riff-x"), { kind: "cell", blockId: "riff-x", cell: 0 });
  for (const cell of [-1, 1.5, 24, "0"]) assert.equal(readTarget({ kind: "cell", blockId: "riff-x", cell }, "riff-x"), null);
  assert.equal(readTarget({ kind: "cell", blockId: "riff-x", cell: 0 }, "riff-y"), null);
});
```

- [ ] **Step 2: Run** `npx tsx --test src/features/contentVideos/server/rules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `rules.ts`** (pure: imports `videoExtension` from `@/features/videos/recording`, Task 1's `isToolKey`, `stepsOfTool`, and `MAX_CELLS`). Returned `steps` keep the order of `stepsOfTool`.
- [ ] **Step 4: Add the table and the column to `schema.ts`**, run `npm run db:generate`, rename the file to `0046_content_videos.sql` (and its tag in `drizzle/meta/_journal.json`). Check the SQL holds only: `create table content_videos`, its RLS line, its foreign key and index, `alter table blocks add column videos jsonb`.
- [ ] **Step 5: Apply it locally:** print `DATABASE_URL`'s host; if it is `localhost`, `npm run db:migrate`. Otherwise stop and say so.
- [ ] **Step 6: Run** the rules test (PASS), `npx tsx --test src/lib/db/*.test.ts`, tsc.
- [ ] **Step 7: Commit** `feat(content-videos): content_videos table, blocks.videos, path and target rules`.

### Task 4: The repo

**Files:**
- Create: `src/features/contentVideos/server/repo.ts`, `repo.memory.ts`, `repo.drizzle.ts`, `repoContract.ts`, `repo.memory.test.ts`
- Modify: `scripts/test-library-db.ts` (run the contract on `drizzleContentVideoRepo`; empty `content_videos` and `blocks.videos` before each test)

**Interfaces:**
- Consumes: `Target`, `BlockVideos` (Task 3); `toolCells` (Task 1).
- Produces (`repo.ts`):

```ts
export interface ContentVideoRow {
  id: string; title: string; note: string; recordedBy: string | null; madeFor: string;
  tool: string | null; steps: string[] | null;
  type: string; seconds: number; width: number; height: number; size: number;
  blobPath: string; overlay: unknown | null; createdAt: Date;
}
/** A video that lost steps to a new one: the steps taken off it, and whether it is left with none (its tool is then null). */
export interface Lost { id: string; title: string; steps: string[]; emptied: boolean }
export interface Pointers { tool: { tool: string; steps: string[] | null } | null; cells: { blockId: string; cell: number }[] }
export interface ContentVideoRepo {
  /** In one transaction: takes the target's steps off the tool's other videos (or, for a tool with no ladder, the tool off them), or points the block's cell at the video; then writes the row with the target's tool and steps. */
  create(row: ContentVideoRow, target: Target): Promise<{ ok: true; lost: Lost[] } | { ok: false; reason: "taken" | "no-block" | "no-cell" }>;
  get(id: string): Promise<ContentVideoRow | null>;
  /** every video, newest first */
  list(): Promise<ContentVideoRow[]>;
  edit(id: string, to: { title: string; note: string }): Promise<ContentVideoRow | null>;
  pointers(id: string): Promise<Pointers>;
  /** null: no such video. Refused, with what points at it, while its tool is set or a block's cell holds it. */
  remove(id: string): Promise<{ ok: true; row: ContentVideoRow } | { ok: false; pointers: Pointers } | null>;
  /** For the lookup: curated blocks' own cells (`blockId → cell → video id`; a hashed or unknown block has none), and every row whose tool is one of `tools` or that one of those cells holds. */
  forLookup(blockIds: string[], tools: string[]): Promise<{ own: Record<string, Record<number, string>>; rows: ContentVideoRow[] }>;
}
```

  - `memoryContentVideoRepo(blocks: { id: string; kind: "curated" | "hashed"; content: { cells: Cell[] }; videos?: BlockVideos | null }[]): ContentVideoRepo` (it writes `videos` on those objects).
  - `drizzleContentVideoRepo(db): ContentVideoRepo`
  - `contentVideoRepoContract(make: (blocks) => Promise<ContentVideoRepo>)`

  `create` with `row.tool` and `row.steps` ignored: the target decides them (`kind: "cell"` → both null). `no-block`: no
  curated block with that id. `no-cell`: `cell >= toolCells(content.cells).length`. `taken`: the id or the path is
  already stored; nothing else is changed then. A video emptied of steps gets `tool: null, steps: null`. Pointing a
  cell at a new video leaves the old video's row alone.

- [ ] **Step 1: Write the contract** (`repoContract.ts`, `node:test` `describe` taking `make`), then `repo.memory.test.ts` running it.

```ts
test("the first video with every step ticked covers the tool", ...);   // create(all steps) → { ok: true, lost: [] }; get().steps equal
test("a level video takes its step off the every-step video", async () => {
  // v-all holds [new, beginner, intermediate, advanced, none]; create v-beg for [beginner]
  assert.deepEqual(res, { ok: true, lost: [{ id: "v-all", title: "All", steps: ["picking-drill:beginner"], emptied: false }] });
  assert.deepEqual((await repo.get("v-all"))!.steps, ["picking-drill:new", "picking-drill:intermediate", "picking-drill:advanced", "none"]);
});
test("a video left with no steps keeps its row with no tool", ...);     // lost[0].emptied true; get(): tool null, steps null
test("another tool's videos are untouched", ...);
test("a tool with no ladder: the new video replaces the old", ...);     // old: tool null; lost [{ steps: [], emptied: true }]
test("a taken id or path changes nothing", ...);                        // { ok: false, reason: "taken" }; the other videos' steps as before
test("a cell target points the curated block's cell at the video", ...); // blocks.videos.cells["1"] === id; row tool null
test("a cell target on a hashed or unknown block is no-block; past the block's tool cells is no-cell", ...);
test("remove is refused while pointed at", async () => {
  // a tool video: { ok: false, pointers: { tool: { tool: "picking-drill", steps: [...] }, cells: [] } }
  // a cell video: pointers.cells deep-equals [{ blockId: "riff-x", cell: 0 }]
  // an emptied video: { ok: true, row }, and get() is null after
  // an unknown id: null
});
test("forLookup gives own cells of curated blocks only, and the rows of the asked tools and of those cells", ...);
test("two saves at once leave each step on one video", async () => {
  await Promise.all([repo.create(rowA, tool(["picking-drill:beginner", "none"])), repo.create(rowB, tool(["picking-drill:beginner"]))]);
  const holders = (await repo.list()).filter((v) => v.steps?.includes("picking-drill:beginner"));
  assert.equal(holders.length, 1);
});
```

- [ ] **Step 2: Run** `npx tsx --test src/features/contentVideos/server/repo.memory.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `repo.memory.ts`**, the readable statement of the rules. Run: PASS.
- [ ] **Step 4: Implement `repo.drizzle.ts`.** `create` runs in `db.transaction`. A tool target first takes
  `select pg_advisory_xact_lock(hashtext(${"content_videos:" + tool}))`: a row lock would not stop two first saves for
  a tool with no rows yet. A cell target reads the block `for update`. The insert uses `on conflict do nothing` on
  `id` and on `blob_path`; no row back means `taken`, and the transaction is rolled back (throw and catch a private
  error). `remove` checks the pointers and deletes in one transaction. Ids are compared as bound parameters.
- [ ] **Step 5: Add it to `scripts/test-library-db.ts`** and run
  `LIBRARY_TEST_DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit_test npm run -s test:library-db`. Expected: PASS, the new contract included. If the local database isn't running, say so in the report; don't skip silently.
- [ ] **Step 6: Commit** `feat(content-videos): the repo, one video per tool and step`.

### Task 5: The seed keeps a block's own video

**Files:**
- Create: `src/features/contentVideos/model/keptCells.ts`, `keptCells.test.ts`
- Modify: `src/features/userData/server/repo.ts`, `repo.drizzle.ts`, `repo.memory.ts` (`upsertCurated`), `seedBlocks.ts`, `seedBlocks.test.ts`, `scripts/db-seed-blocks.ts`

**Interfaces:**
- Produces:
  - `keptCells(cells: Record<string, string>, before: Cell[], after: Cell[]): { kept: Record<string, string>; dropped: { cell: number; videoId: string }[] }`
  - `upsertCurated(...)` resolves with one more field: `droppedVideos: { blockId: string; cell: number; videoId: string }[]`. `seedBlocks` returns it too.

  The rule **(call)**: an entry is kept only when the block has as many tool cells after as before **and** the tool
  key (`toolKeyOf`) at its index is the same. If the count changed, every entry of the block is dropped, since no
  position can be trusted. Text edits, a changed level or other settings keep it. `upsertCurated` never writes
  `videos` otherwise: the column is not in its insert values nor in its `set`.

- [ ] **Step 1: Write the failing tests.**

```ts
// keptCells.test.ts
test("same tools in the same places: kept", ...);                    // also when a text cell is added or a level changes
test("another tool at the index: that entry is dropped", ...);       // dropped [{ cell: 1, videoId: "v1" }], the others kept
test("a play-along given another shape is another tool", ...);
test("a tool cell added or removed: every entry is dropped", ...);
// seedBlocks.test.ts (memory repo)
test("a second seed run keeps blocks.videos", ...);
test("a seed run that swaps a cell's tool drops that cell's video and logs it", async () => {
  // log has a line: `video dropped  <block id>  cell 1  <video id>  (the video is kept; point the cell at it again)`
  assert.deepEqual(r.droppedVideos, [{ blockId: "b", cell: 1, videoId: "v1" }]);
});
```

- [ ] **Step 2: Run** both files. Expected: FAIL. **Step 3: Implement** `keptCells`, then `upsertCurated` in both
  repos: inside the transaction, before the upsert, read `id, content, videos` of the listed blocks whose `videos` is
  not null, and write back only the blocks whose entries changed. A changed `videos` alone doesn't raise `revision`.
  The memory repo's stored block gains `videos`.
- [ ] **Step 4:** `scripts/db-seed-blocks.ts` ends its summary with `N cell videos dropped` when N > 0.
- [ ] **Step 5: Run** `npx tsx --test src/features/contentVideos/model/*.test.ts src/features/userData/server/*.test.ts` (PASS) and `test:library-db`.
- [ ] **Step 6: Commit** `feat(seed): a block's own video is kept, and dropped when its cell moves`.

### Task 6: Saving, editing and deleting

**Files:**
- Create: `src/features/contentVideos/server/access.ts`, `access.test.ts`, `server/http.ts`
- Create: `src/app/api/content-videos/upload/route.ts`, `src/app/api/content-videos/route.ts`, `src/app/api/content-videos/[id]/route.ts`

**Interfaces:**
- Consumes: `ContentVideoRepo`, `memoryContentVideoRepo` (Task 4); `readTarget`, `contentVideoPath`, `isMadeFor`, `cleanNote` (Task 3); from `@/features/videos/server/rules`: `checkUpload`, `isPrivateBlobUrl`, `isVideoId`, `MAX_VIDEO_BYTES`; `BlobLookup`, `Refused` types from `@/features/videos/server/access`; `cleanTitle` from `@/features/videos/ref`; `permissionCheck` from `@/features/devtools/server/access`.
- Produces (`access.ts`, no Request, no SQL, no Blob SDK):

```ts
export interface ContentVideoInfo { id: string; title: string; note: string; madeFor: string; tool: string | null; steps: string[] | null; type: string; seconds: number; width: number; height: number; size: number; savedAt: number; overlay: unknown | null }
export const contentVideoInfo: (row: ContentVideoRow) => ContentVideoInfo;
/** clientPayload: JSON { id, type, size, madeFor } */
export function planContentUpload(repo, pathname: string, clientPayload: string | null): Promise<{ ok: true; allowedContentTypes: string[] } | Refused>;
/** raw: { id, title, note, type, seconds, width, height, path, madeFor, target } */
export function completeContentUpload(repo, userId: string, raw: unknown, blobs: BlobLookup, now: Date): Promise<{ ok: true; video: ContentVideoInfo; lost: Lost[] } | Refused>;
export function editContentVideo(repo, id: string, raw: unknown): Promise<ContentVideoInfo | null>;
export function deleteContentVideo(repo, id: string): Promise<{ ok: true; row: ContentVideoRow } | { ok: false; status: 409; error: string; pointers: Pointers } | null>;
```

  - `http.ts`: `contentVideos(env = process.env): { repo: ContentVideoRepo } | null` (null without a database, as `userData()`).
  - Routes, each starting with `permissionCheck(req, "content")`:
    - `POST /api/content-videos/upload`: the client token. 401 `Log in to save a video.` when the check gives no account; 503 without a Blob token or a database; `handleUpload` options as `src/app/api/videos/upload/route.ts` (`addRandomSuffix: false, allowOverwrite: false, maximumSizeInBytes: MAX_VIDEO_BYTES`).
    - `GET /api/content-videos` → `{ videos: ContentVideoInfo[] }` (ContentVideos5's page reads it). `POST` → `{ video, lost }`; 401 with no account.
    - `PATCH /api/content-videos/[id]` `{ title, note }` → `{ video }` or 404. `DELETE` → 200 after the row is gone and then the file (`del`; a file that won't delete is logged, the answer stays 200), 409 `{ error, pointers }`, 404.

  Refusals of `completeContentUpload`: bad shape or target → 400 `Bad request.`; path not `contentVideoPath(madeFor, id, type)` → 403; file not found → 400 `The upload didn't finish. Try again.`; a public blob is deleted and refused as for a player's video; `taken` → 409 `This video is already saved.`; `no-block` → 409 `This exercise isn't in the library here yet. Run db:seed-blocks, then save again.`; `no-cell` → 409 `This exercise has changed and that tool isn't where it was. Reload and save again.` Seconds up to `MAX_TAKE_SECONDS + 60`, width and height up to 10000, as a player's video. `overlay` is stored null (ContentVideos5 writes it).

- [ ] **Step 1: Write the failing tests** (`access.test.ts`, over the memory repo and a fake `BlobLookup`).

```ts
test("the upload is planned only for this video's own path", ...);     // right path ok; another made_for, another id, a player's videos/ path → 403
test("a taken id is refused before the upload", ...);                   // 409
test("saving writes the row with the target's steps and says what lost them", ...);
test("the stored size is the store's, not the browser's", ...);
test("a public blob is deleted and refused", ...);                      // blobs.drop called with the path
test("a target for another made_for is a bad request", ...);
test("a cell save on a block that isn't stored says to seed", ...);    // status 409, the no-block words
test("edit trims the title and the note; an unknown id is null", ...);
test("delete names what points at it", async () => {
  // 409, error "A tool or an exercise still shows this video. Give its levels to another video first.", pointers as the repo's
});
test("a video nothing points at deletes", ...);
```

- [ ] **Step 2: Run** `npx tsx --test src/features/contentVideos/server/access.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `access.ts` and `http.ts`**, then the three route files (thin: gate, token and database checks, call, `json`). Run: PASS.
- [ ] **Step 4:** Run the copy pass (`design:ux-copy` + "Words about the app") over every `error` string above; keep the tests' strings in step.
- [ ] **Step 5:** tsc, eslint on the new files. **Commit** `feat(content-videos): upload, save, edit and delete routes`.

### Task 7: Watching and the lookup route

**Files:**
- Modify: `src/features/videos/server/stream.ts`, `stream.test.ts` (`streamAnswer(read, cache?)`)
- Modify: `src/features/contentVideos/server/access.ts`, `access.test.ts`
- Create: `src/app/api/content-videos/[id]/file/route.ts`, `src/app/api/content-videos/lookup/route.ts`

**Interfaces:**
- Consumes: `blockVideos`, `CellVideo` (Task 2); `forLookup` (Task 4).
- Produces:
  - `streamAnswer(read: BlobRead | null, cache: string = "private, no-store"): Response`: the `cache-control` of a 200 or 206. Errors stay `no-store`.
  - `CONTENT_VIDEO_CACHE = "public, max-age=3600"` **(call:** an id's file never changes; a deleted video may play from a cache for up to an hour).
  - `interface PlayInfo { id: string; title: string; note: string; seconds: number; width: number; height: number; overlay: unknown | null }`
  - `interface LookupAsk { key: string; blockId?: string; cells: CellAsk[] }`
  - `readLookup(raw: unknown): LookupAsk[] | null`: null (→ 400) unless `{ blocks: [...] }` with at most 60 blocks, each a `key` (1–200 characters, unique), an optional `blockId` (string, 200 at most), and at most `MAX_CELLS` cells, each `cell` a whole number 0–23, `tool` a string of 80 at most, `step` a string of 80 at most or null.
  - `lookUp(repo, asks: LookupAsk[]): Promise<{ blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> }>`: a cell whose video's row is missing is left out; `videos` holds only the videos named in `blocks`.
  - `GET /api/content-videos/[id]/file`: no session read, no cookies. 404 (`streamAnswer(null)`) for a bad id, an unknown video, no database or no store; else Blob's `get` with the Range passed on and `streamAnswer(read, CONTENT_VIDEO_CACHE)`; `failedStream` on a throw.
  - `POST /api/content-videos/lookup`: no session. 400 on `readLookup` null; without a database `{ blocks: {}, videos: {} }`; else `lookUp`. Answered `cache-control: no-store` (a video saved now shows on the next draw). A repo that throws is logged and answered 502 `{ error }`.

- [ ] **Step 1: Write the failing tests.**

```ts
// stream.test.ts
test("a content video's answer may be cached; an error never is", () => {
  assert.equal(streamAnswer(read206, "public, max-age=3600").headers.get("cache-control"), "public, max-age=3600");
  assert.equal(streamAnswer(read206).headers.get("cache-control"), "private, no-store");
  assert.equal(streamAnswer(null, "public, max-age=3600").headers.get("cache-control"), "no-store");
});
// access.test.ts
test("readLookup refuses junk and anything too large", () => {
  for (const bad of [null, [], {}, { blocks: "x" }, { blocks: Array(61).fill(okBlock) }, { blocks: [{ ...okBlock, cells: Array(25).fill(okCell) }] }, { blocks: [okBlock, okBlock] }, { blocks: [{ ...okBlock, cells: [{ cell: -1, tool: "x", step: null }] }] }])
    assert.equal(readLookup(bad), null);
});
test("lookUp answers per block key, each video once", ...);           // two keys with the same blockId both answered
test("a block's own video shows only under that block's id", ...);    // the same cells with no blockId, or a hashed id, get the tool video
test("an unknown tool or block id is simply empty", ...);
test("the answer carries no path, recorder or size", () => assert.deepEqual(Object.keys(out.videos[id]).sort(), ["height", "id", "note", "overlay", "seconds", "title", "width"]));
```

- [ ] **Step 2: Run** `npx tsx --test src/features/videos/server/stream.test.ts src/features/contentVideos/server/access.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, then the two routes. Run: PASS.
- [ ] **Step 4:** tsc, eslint. **Commit** `feat(content-videos): the file route and the lookup`.

### Task 8: The Take panel saves the take

**Files:**
- Create: `src/features/contentVideos/client/api.ts`, `api.test.ts` (`package.json` `test` already covers `contentVideos/*/*.test.ts`)
- Modify: `src/features/devtools/riff/takes.ts`, `RiffTake.tsx`, `RiffLab.tsx`, `blocks.ts`, `blocks.test.ts`

**Interfaces:**
- Consumes: the routes of Tasks 6 and 7; `contentVideoPath` (Task 3); `Target`, `ContentVideoInfo`, `Lost`, `LookupAsk`, `CellVideo`, `PlayInfo`.
- Produces (`client/api.ts`):

```ts
export const contentVideoFileUrl = (id: string): string => `/api/content-videos/${id}/file`;
export interface SaveInput { id: string; blob: Blob; type: string; title: string; note: string; seconds: number; width: number; height: number; madeFor: string; target: Target; /** the file is in the store already: only the row is missing */ fileUp?: boolean }
export type SaveResult = { ok: true; video: ContentVideoInfo; lost: Lost[] } | { ok: false; error: string; fileUp: boolean };
export function saveContentVideo(input: SaveInput, deps?: { put: (path: string, blob: Blob, opts: { clientPayload: string; contentType: string }) => Promise<unknown>; fetch: typeof fetch }): Promise<SaveResult>;
export function lookUpVideos(blocks: LookupAsk[]): Promise<{ blocks: Record<string, CellVideo[]>; videos: Record<string, PlayInfo> }>; // 10 s timeout; throws with the server's words or "The videos could not be loaded."
```

  - `saveContentVideo` never throws. The default `put` is `upload()` from `@vercel/blob/client` (`access: "private"`, `handleUploadUrl: "/api/content-videos/upload"`). The row is `POST /api/content-videos` with a 20 s timeout (`AbortSignal.timeout`). A 409 from the row is an error with `fileUp: true` and the server's words; it is not taken for a save.
  - `RiffBlock.cell: number` (`blocks.ts`): the riff tool's index among the exercise's tool cells in reading order (the same count as `toolCells`).
  - `RiffTake` (`takes.ts`) gains `videoId?: string; fileUp?: boolean; uploaded?: boolean`, and `RiffTake.tsx` takes a `cell: number` prop.

- [ ] **Step 1: Write the failing tests.**

```ts
// api.test.ts (fake put and fetch)
test("the file goes to its content path, then the row is saved", ...);  // put called with contentVideoPath(madeFor, id, type); result ok with the server's video and lost
test("a take whose file is up only retries the row", ...);             // fileUp: true → put not called
test("a failed transfer tries the row once", ...);                      // put rejects, the row answers 200 → ok (the file was up from an earlier try)
test("a failed transfer and a refused row give the server's words", ...); // { ok: false, error: "The upload didn't finish. Try again.", fileUp: false }
test("the file is up but the row times out", ...);                      // { ok: false, fileUp: true, error: "The video is uploaded but wasn't saved. Save it again." }
// blocks.test.ts
test("a riff block says which tool cell its riff is", ...);            // a file with a tool before the riff's play-along → cell 1; a riff inside a section counts through it
```

- [ ] **Step 2: Run** `npx tsx --test src/features/contentVideos/client/api.test.ts src/features/devtools/riff/blocks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `api.ts` and `RiffBlock.cell`.** Run: PASS.
- [ ] **Step 4: Wire the Take panel** (load `design:ux-copy` and "Words about the app" first; the strings here are drafts):
  - A new button beside **Save file**: **Save for players**. It is there for a take that isn't uploaded yet. While it runs the status reads `Uploading…`; after, `Saved for players`; the button goes.
  - Pressing it: the take gets a `videoId` (`crypto.randomUUID()`, once, stored with the take in IndexedDB before the upload starts), then `saveContentVideo({ id: videoId, blob, type, title: name, note: "", seconds, width, height, madeFor: riff, target: { kind: "cell", blockId: riff, cell }, fileUp })`. Width and height are the take `<video>`'s `videoWidth` and `videoHeight`.
  - A result with `fileUp: true` is stored on the take, so the next press sends only the row. On success the take is stored with `uploaded: true`. The take stays in IndexedDB either way: Transcribe and Read the neck read it there.
  - A failure shows in the panel's `problem` line with the server's words and the take keeps **Save for players** and **Save file**. If `lost` is not empty it can't be here (a cell target takes no steps): ignore it.
  - A new recording replaces the take and starts again with no `videoId`; **Back to the previous take** restores the old take with its own.
  - `RiffLab.tsx` passes the open riff's `cell`. The existing **Save** (shown when the browser refused to store the take) and **Save file** keep their jobs.
- [ ] **Step 5:** tsc, eslint, `npx tsx --test src/features/devtools/*/*.test.ts src/features/devtools/*/*.test.tsx`.
- [ ] **Step 6: Commit** `feat(riff): the Take panel saves the take as the block's video`.

### Task 9: Docs, the walk, tasks.txt

**Files:**
- Create: `src/features/contentVideos/README.md`, `src/features/contentVideos/CLAUDE.md`
- Modify: `src/features/videos/README.md` (`streamAnswer`'s cache argument; a line pointing at content videos), `src/features/devtools/README.md` (the Take panel paragraph), `src/features/userData/CLAUDE.md` or its README where `upsertCurated` is described, `src/features/library/seed/README.md` only if `git status` shows no one else has it changed (else name it in the report), `tasks.txt` (ContentVideos3 → `[DONE <date>]`)

- [ ] **Step 1: Write `README.md`** (what a content video is, the file table, the routes with who may call each, the lookup order, the seed rule) **and `CLAUDE.md`**. The rules it must hold:
  - `model/` stays pure and tested; steps come from `LADDERS` and are never restated; a new ladder is added to `TOOL_LADDERS` (a test fails until it is).
  - One video per tool and step, kept by `create`'s transaction; no other code writes `tool`, `steps` or `blocks.videos`.
  - The seed never writes `blocks.videos` except to drop a moved cell, which it prints.
  - Imports: `@/features/plan/model` (ladders, tools), `@/features/videos` (`recording`, `ref`, `server/rules`, `server/stream`, the `BlobLookup` and `Refused` types), `@/features/devtools/server/access` in routes only. Nothing from `videos/library.ts`.
  - The file and lookup routes read no session; every other route starts with `permissionCheck(req, "content")`.
  - A delete is refused while something points at the video.
- [ ] **Step 2: The walk**, on the dev server with the local database seeded (`npm run -s db:seed-blocks`) and signed in (a save needs an account). Chrome on `localhost` is the user's real profile: change no stored data but the riff take you record, or use a scratch server on `127.0.0.1:3107`.
  1. `/admin/content/riff`: open a riff, record a short take, **Save for players**. The status reads saved; `select id, made_for, tool, steps, blob_path from content_videos` shows the row with `tool` null; `select videos from blocks where id = '<riff block>'` holds the cell.
  2. `curl -s -X POST localhost:3000/api/content-videos/lookup -H 'content-type: application/json' -d '{"blocks":[{"key":"a","blockId":"<riff block>","cells":[{"cell":<n>,"tool":"guitar-play-along:riff","step":null}]}]}'` names the video with `"from":"block"`.
  3. `curl -s -o /dev/null -w '%{http_code} %header{content-range}\n' -H 'range: bytes=0-99' localhost:3000/api/content-videos/<id>/file` → `206` with a range, in a signed-out shell.
  4. Signed out: `POST /api/content-videos` → 404 in production mode; in development 401 with the log-in line.
  5. `npm run -s db:seed-blocks` again: the block's `videos` is unchanged and nothing is printed as dropped.
  6. Without a Blob token locally the save can't run: say which of 1–3 were not checked and why; don't claim them.
- [ ] **Step 3:** Run the whole of `npm test` (cached tsx), tsc, eslint on every changed file.
- [ ] **Step 4:** Offer to update the database schema page (the ER diagram artifact of `schema.ts`): two changes, `content_videos` and `blocks.videos`.
- [ ] **Step 5:** Mark ContentVideos3 done in `tasks.txt` with the date, and add under it anything left unchecked (the colon path against the real store, the Postgres contract if it didn't run). **Commit** `docs(content-videos): storage and lookup; ContentVideos3 done`.
- [ ] **Step 6: Report:** first line the git state; then what was checked and what wasn't; the copy strings old → new; the calls made here that the user may overrule: `made_for` is the plain block id for a riff; a count change drops every cell entry of the block; the file route caches for an hour; the file transfer has no timeout; a video emptied of steps has `steps` null as well as `tool`.
