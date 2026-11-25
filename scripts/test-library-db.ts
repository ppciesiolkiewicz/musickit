/**
 * Runs the library contract (src/features/library/server/repoContract.ts) and the content video contract
 * (src/features/contentVideos/server/repoContract.ts) against Postgres, and the block provenance cases of
 * src/features/userData/server/provenance.test.ts against the Drizzle user data repo. Wipes the database it is given.
 *
 *   LIBRARY_TEST_DATABASE_URL=postgres://musickit:musickit@localhost:5433/musickit_test npm run -s test:library-db
 *
 * Only a local database whose name ends in `_test`, with no query string (`localTestDatabase`): it drops and recreates that database's `public` schema, runs the
 * migrations (run from the repo root), and truncates every table before each test. It never reads .env or .env.local. Not part of `npm test`.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import type { Db } from "../src/lib/db/client";
import type { BlockKey } from "../src/features/plan/model/blockId";
import { libraryRepoContract } from "../src/features/library/server/repoContract";
import { drizzleLibraryRepo } from "../src/features/library/server/repo.drizzle";
import { PLAYER_A, type LibraryData } from "../src/features/library/server/fixture";
import { localTestDatabase } from "../src/features/library/server/testDatabase";
import { contentVideoRepoContract } from "../src/features/contentVideos/server/repoContract";
import { drizzleContentVideoRepo } from "../src/features/contentVideos/server/repo.drizzle";
import { drizzleUserDataRepo } from "../src/features/userData/server/repo.drizzle";
import type { CuratedBlock, NewBlock, Provenance } from "../src/features/userData/server/repo";

const target = localTestDatabase(process.env.LIBRARY_TEST_DATABASE_URL);
if (!target) {
  console.error("Set LIBRARY_TEST_DATABASE_URL to a local database whose name ends in _test, with no query string, such as");
  console.error("postgres://musickit:musickit@localhost:5433/musickit_test (its public schema is dropped and remade).");
  process.exit(1);
}
// connect by the checked parts only, never by the raw string
const { host, port, database, username, password, url } = target;
const client = postgres({ host, port, database, username, password, max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
const db: Db = drizzle(client, { schema });
// the content video contract saves twice at once: a second pool with room for both, so the advisory lock is what keeps them apart
const pair = postgres({ host, port, database, username, password, max: 4, prepare: false, connect_timeout: 10, onnotice: () => {} });
const pairDb: Db = drizzle(pair, { schema });
after(() => Promise.all([client.end({ timeout: 5 }), pair.end({ timeout: 5 })]));

/** A fresh schema with every migration applied, once per run. */
const ready = (async () => {
  await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  try {
    execFileSync(process.execPath, [path.join("scripts", "db-migrate.mjs")], {
      env: { ...process.env, DATABASE_URL: url, NO_COLOR: "1" },
      stdio: "pipe",
    });
  } catch (e) {
    const out = e as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`migrations failed\n${out.stdout?.toString() ?? ""}${out.stderr?.toString() ?? ""}`);
  }
})();

/** Empties every table but `plans` (whose rows the migrations write). */
async function truncate() {
  await ready;
  const rows = await client<{ t: string }[]>`select tablename as t from pg_tables where schemaname = 'public' and tablename <> 'plans'`;
  if (rows.length) await client.unsafe(`truncate table ${rows.map((r) => `"public"."${r.t}"`).join(", ")} cascade`);
}

async function load(data: LibraryData) {
  await truncate();
  const s = schema;
  if (data.users.length) await db.insert(s.users).values(data.users.map((u) => ({ id: u.id, email: `${u.id}@test.local`, name: "Test", role: "student" as const })));
  if (data.blocks.length) await db.insert(s.blocks).values(data.blocks);
  if (data.choices.length) await db.insert(s.choices).values(data.choices);
  if (data.owners.length) await db.insert(s.blockOwners).values(data.owners);
  if (data.progress.length) await db.insert(s.progressEntries).values(data.progress);
  if (data.dayTimes.length) await db.insert(s.planDayTimes).values(data.dayTimes.map((t) => ({ ...t, spent: t.spent ?? sql`'null'::jsonb` })));
}

libraryRepoContract(async (data) => {
  await load(data);
  return drizzleLibraryRepo(db);
});

// every table is emptied before each test (`content_videos` and `blocks.videos` with it), then the contract's blocks are stored
contentVideoRepoContract(async (list) => {
  await truncate();
  await db.insert(schema.blocks).values(list.map((b) => ({ id: b.id, kind: b.kind, content: b.content, videos: b.videos ?? null })));
  return drizzleContentVideoRepo(pairDb);
});

describe("user data repo on Postgres: block provenance", () => {
  const NOW = new Date(2026, 10, 15, 12);
  const key = (title: string): BlockKey => ({ content: { title, cells: [] } }) as unknown as BlockKey;
  const block = (id: string, extra: Partial<NewBlock> = {}): NewBlock => ({ id, key: key(id), parentId: null, source: "ai", ...extra });
  const prov = (p: Partial<Provenance>): Provenance => ({ model: null, promptVersion: null, docsAgents: null, docsTeaching: null, ...p });
  const full = prov({ model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 });
  const repo = drizzleUserDataRepo(db);
  const fresh = async () => {
    await truncate();
    await db.insert(schema.users).values({ id: PLAYER_A, email: "a@test.local", name: "A", role: "student" });
  };
  const provenanceOf = async (id: string): Promise<Provenance | undefined> => {
    const [r] = await db
      .select({ model: schema.blocks.model, promptVersion: schema.blocks.promptVersion, docsAgents: schema.blocks.docsAgents, docsTeaching: schema.blocks.docsTeaching })
      .from(schema.blocks)
      .where(eq(schema.blocks.id, id));
    return r;
  };

  test("addBlocks stores provenance, and a later one for the same id leaves the first", async () => {
    await fresh();
    await repo.addBlocks(null, [block("a", { provenance: full })], NOW);
    await repo.addBlocks(PLAYER_A, [block("a", { provenance: prov({ model: "m2", promptVersion: 9 }) })], NOW);
    assert.deepEqual(await provenanceOf("a"), full);
  });
  test("a block stored without provenance is filled by a later addBlocks that has one", async () => {
    await fresh();
    await repo.addBlocks(PLAYER_A, [block("a")], NOW);
    assert.deepEqual(await provenanceOf("a"), prov({}));
    await repo.addBlocks(PLAYER_A, [block("a", { provenance: full })], NOW);
    assert.deepEqual(await provenanceOf("a"), full);
  });
  test("a block with only a model set is not filled", async () => {
    await fresh();
    await repo.addBlocks(PLAYER_A, [block("a", { provenance: prov({ model: "m1" }) })], NOW);
    await repo.addBlocks(PLAYER_A, [block("a", { provenance: full })], NOW);
    assert.deepEqual(await provenanceOf("a"), prov({ model: "m1" }));
  });
  test("a block with a parent and no provenance takes the parent's, when both arrive in one call", async () => {
    await fresh();
    await repo.addBlocks(PLAYER_A, [block("p", { provenance: full }), block("c", { parentId: "p" })], NOW);
    assert.deepEqual(await provenanceOf("c"), full);
  });
  test("a block with a parent and no provenance takes the stored parent's in a later call", async () => {
    await fresh();
    await repo.addBlocks(PLAYER_A, [block("p", { provenance: full })], NOW);
    await repo.addBlocks(PLAYER_A, [block("c", { parentId: "p" })], NOW);
    assert.deepEqual(await provenanceOf("c"), full);
  });
  test("a block with a parent keeps its own provenance", async () => {
    await fresh();
    const own = prov({ model: "mine" });
    await repo.addBlocks(PLAYER_A, [block("p", { provenance: full }), block("c", { parentId: "p", provenance: own })], NOW);
    assert.deepEqual(await provenanceOf("c"), own);
  });
  const curated = (id: string, names: string[], over: Partial<CuratedBlock> = {}): CuratedBlock => ({
    id,
    content: { title: id, cells: [] } as unknown as CuratedBlock["content"],
    area: "guitar",
    topic: "guitar-techniques",
    concepts: ["picking"],
    tags: ["technique"],
    slot: { why: "w" },
    provenance: full,
    choices: names.map((name, place) => ({ id: `${id}/${name}`, name, level: "beginner", steps: ["picking:1"], moves: null, minutes: 4 + place, active: true, place })),
    ...over,
  });
  const choiceRows = async () =>
    (await db.select().from(schema.choices).orderBy(schema.choices.id)).map((c) => ({ id: c.id, active: c.active, minutes: c.minutes, place: c.place, updatedAt: c.updatedAt.getTime() }));
  test("upsertCurated stores curated blocks with no level or steps, their choices and the app's owner row", async () => {
    await fresh();
    assert.deepEqual(await repo.upsertCurated([curated("guitar-a-b", ["beginner", "new"])], NOW), { blocks: 1, choices: 2, deactivated: 0, revised: 0, droppedVideos: [] });
    const [b] = await db.select().from(schema.blocks);
    assert.deepEqual([b.kind, b.level, b.steps, b.tags, b.why, b.minutes, b.model, b.revision], ["curated", null, [], ["technique"], "w", 4, "m1", 1]);
    const owners = await db.select({ userId: schema.blockOwners.userId, source: schema.blockOwners.source }).from(schema.blockOwners);
    assert.deepEqual(owners, [{ userId: null, source: "seed" }]);
    const [c] = await db.select().from(schema.choices).where(eq(schema.choices.id, "guitar-a-b/new"));
    assert.deepEqual([c.blockId, c.name, c.level, c.steps, c.moves, c.minutes, c.active, c.place], ["guitar-a-b", "new", "beginner", ["picking:1"], null, 5, true, 1]);
  });
  test("upsertCurated twice changes nothing; a text edit and new provenance overwrite the block under the same id", async () => {
    await fresh();
    await repo.upsertCurated([curated("guitar-a-b", ["beginner"])], NOW);
    const before = await choiceRows();
    const later = new Date(NOW.getTime() + 60_000);
    assert.equal((await repo.upsertCurated([curated("guitar-a-b", ["beginner"])], later)).deactivated, 0);
    assert.deepEqual(await choiceRows(), before);
    await repo.upsertCurated([curated("guitar-a-b", ["beginner"], { content: { title: "New title", cells: [] } as unknown as CuratedBlock["content"], tags: ["rhythm"], provenance: { ...full, model: "m2" } })], later);
    const rows = await db.select().from(schema.blocks);
    assert.deepEqual(rows.map((r) => [r.id, (r.content as { title: string }).title, r.tags, r.model]), [["guitar-a-b", "New title", ["rhythm"], "m2"]]);
    assert.equal((await db.select().from(schema.blockOwners)).length, 1);
  });
  test("upsertCurated makes a dropped choice and a removed block's choices inactive, and a changed choice moves updated_at", async () => {
    await fresh();
    await repo.upsertCurated([curated("guitar-a-b", ["beginner", "new"]), curated("guitar-c-d", ["beginner"])], NOW);
    const later = new Date(NOW.getTime() + 60_000);
    // a hashed block's rows are never touched
    await repo.addBlocks(null, [block("a")], NOW);
    assert.equal((await repo.upsertCurated([curated("guitar-a-b", ["beginner"], { choices: [{ ...curated("guitar-a-b", ["beginner"]).choices[0], minutes: 9 }] })], later)).deactivated, 2);
    assert.deepEqual(await choiceRows(), [
      { id: "guitar-a-b/beginner", active: true, minutes: 9, place: 0, updatedAt: later.getTime() },
      { id: "guitar-a-b/new", active: false, minutes: 5, place: 1, updatedAt: later.getTime() },
      { id: "guitar-c-d/beginner", active: false, minutes: 4, place: 0, updatedAt: later.getTime() },
    ]);
    assert.equal((await repo.upsertCurated([curated("guitar-a-b", ["beginner"], { choices: [{ ...curated("guitar-a-b", ["beginner"]).choices[0], minutes: 9 }] })], later)).deactivated, 0);
  });
  test("upsertCurated raises a stored block's revision by one in each call that changes it or a choice of it, and in no other", async () => {
    await fresh();
    const revs = async () => Object.fromEntries((await db.select({ id: schema.blocks.id, revision: schema.blocks.revision }).from(schema.blocks)).map((r) => [r.id, r.revision]));
    const ab = (over: Partial<CuratedBlock> = {}) => curated("guitar-a-b", ["beginner", "new"], over);
    const cd = curated("guitar-c-d", ["beginner"]);
    const later = new Date(NOW.getTime() + 60_000);
    assert.equal((await repo.upsertCurated([ab(), cd], NOW)).revised, 0);
    // a hashed block is never revised
    await repo.addBlocks(null, [block("a")], NOW);
    assert.deepEqual(await revs(), { "guitar-a-b": 1, "guitar-c-d": 1, [block("a").id]: 1 });
    // the same again: nothing
    assert.equal((await repo.upsertCurated([ab(), cd], later)).revised, 0);
    assert.deepEqual(await revs(), { "guitar-a-b": 1, "guitar-c-d": 1, [block("a").id]: 1 });
    // content, tags, slot and provenance in one call: one revision, the other block untouched
    const text = { content: { title: "New title", cells: [] } as unknown as CuratedBlock["content"], tags: ["rhythm"], slot: { why: "w2" }, provenance: { ...full, model: "m2" } };
    assert.equal((await repo.upsertCurated([ab(text), cd], later)).revised, 1);
    assert.deepEqual([(await revs())["guitar-a-b"], (await revs())["guitar-c-d"]], [2, 1]);
    assert.equal((await repo.upsertCurated([ab(text), cd], later)).revised, 0);
    // a choice changed; a choice added; both with a text edit are still one
    const longer = ab(text).choices.map((c, i) => (i ? c : { ...c, minutes: 9 }));
    assert.equal((await repo.upsertCurated([ab({ ...text, choices: longer }), cd], later)).revised, 1);
    const more = [...longer, { ...longer[0], id: "guitar-a-b/advanced", name: "advanced", place: 2 }];
    assert.equal((await repo.upsertCurated([ab({ ...text, tags: ["technique"], choices: more }), cd], later)).revised, 1);
    assert.deepEqual([(await revs())["guitar-a-b"], (await revs())["guitar-c-d"]], [4, 1]);
    // a choice dropped, and a block no longer listed: both revised, once each
    assert.deepEqual(await repo.upsertCurated([ab({ ...text, tags: ["technique"], choices: more.slice(0, 2) })], later), { blocks: 1, choices: 2, deactivated: 2, revised: 2, droppedVideos: [] });
    assert.deepEqual(await revs(), { "guitar-a-b": 5, "guitar-c-d": 2, [block("a").id]: 1 });
  });
  test("putProgress stores choice_id and keeps it (and block_id) when a later write lacks it", async () => {
    await fresh();
    const entry = (over: object) => ({ id: "e1", planId: "p", exerciseId: "x1", day: 0, exercise: 0, title: "T", stars: 3 as const, at: "2026-11-15T10:00:00Z", ...over });
    const row = async () => (await db.select().from(schema.progressEntries))[0];
    await repo.putProgress(PLAYER_A, entry({ blockId: "guitar-a-b", choiceId: "guitar-a-b/beginner" }), NOW);
    assert.equal((await row()).choiceId, "guitar-a-b/beginner");
    await repo.putProgress(PLAYER_A, entry({ stars: 4 }), NOW);
    const r = await row();
    assert.deepEqual([r.blockId, r.choiceId, (r.entry as { choiceId?: string }).choiceId, (r.entry as { blockId?: string }).blockId], ["guitar-a-b", "guitar-a-b/beginner", "guitar-a-b/beginner", "guitar-a-b"]);
    await repo.putProgress(PLAYER_A, entry({ blockId: "guitar-a-b", choiceId: "guitar-a-b/new" }), NOW);
    assert.equal((await row()).choiceId, "guitar-a-b/new");
  });
  test("upsertCurated keeps blocks.videos, and drops an entry only when its cell's tool moved", async () => {
    await fresh();
    const tool = (t: Record<string, unknown>) => ({ type: "tool", tool: t });
    const drill = tool({ type: "picking-drill", level: "beginner", bpm: 60 });
    const withCells = (...cells: unknown[]) => curated("guitar-a-b", ["beginner"], { content: { title: "T", cells } as unknown as CuratedBlock["content"] });
    const videosOf = async () => (await db.select({ videos: schema.blocks.videos, revision: schema.blocks.revision }).from(schema.blocks).where(eq(schema.blocks.id, "guitar-a-b")))[0];
    await repo.upsertCurated([withCells({ type: "text", text: "a" }, drill, tool({ type: "interval-ears", query: "m3" }))], NOW);
    assert.equal((await videosOf()).videos, null);
    await db.update(schema.blocks).set({ videos: { cells: { "0": "v0", "1": "v1" } } }).where(eq(schema.blocks.id, "guitar-a-b"));
    const later = new Date(NOW.getTime() + 1000);
    assert.deepEqual(await repo.upsertCurated([withCells({ type: "text", text: "a" }, drill, tool({ type: "interval-ears", query: "m3" }))], later), { blocks: 1, choices: 1, deactivated: 0, revised: 0, droppedVideos: [] });
    assert.deepEqual(await videosOf(), { videos: { cells: { "0": "v0", "1": "v1" } }, revision: 1 });
    // a text edit and a changed level move no tool
    assert.deepEqual((await repo.upsertCurated([withCells({ type: "text", text: "b" }, tool({ type: "picking-drill", level: "advanced", bpm: 90 }), tool({ type: "interval-ears", query: "m3" }))], later)).droppedVideos, []);
    assert.deepEqual((await videosOf()).videos, { cells: { "0": "v0", "1": "v1" } });
    // cell 1 becomes another tool
    const r = await repo.upsertCurated([withCells(drill, tool({ type: "note-finder" }))], later);
    assert.deepEqual(r.droppedVideos, [{ blockId: "guitar-a-b", cell: 1, videoId: "v1" }]);
    assert.deepEqual((await videosOf()).videos, { cells: { "0": "v0" } });
    // a tool cell added: every entry goes
    assert.equal((await repo.upsertCurated([withCells(drill, tool({ type: "note-finder" }), drill)], later)).droppedVideos.length, 1);
    assert.deepEqual((await videosOf()).videos, { cells: {} });
  });
  test("ownCurated adds the player's owner row only for a stored block, writes no block row, and twice adds one", async () => {
    await fresh();
    await repo.upsertCurated([curated("guitar-a-b", ["beginner"])], NOW);
    const blocksBefore = await db.select().from(schema.blocks);
    await repo.ownCurated(PLAYER_A, ["guitar-a-b", "guitar-unknown-one"], NOW);
    await repo.ownCurated(PLAYER_A, ["guitar-a-b"], NOW);
    assert.deepEqual(await db.select().from(schema.blocks), blocksBefore);
    const owners = await db.select().from(schema.blockOwners).where(eq(schema.blockOwners.userId, PLAYER_A));
    assert.deepEqual(owners.map((o) => [o.blockId, o.source]), [["guitar-a-b", "seed"]]);
  });
});
