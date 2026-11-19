/**
 * Runs the library contract (src/features/library/server/repoContract.ts) against Postgres, and the block provenance cases of
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
after(() => client.end({ timeout: 5 }));

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
  // `answers` is NOT NULL jsonb: a null in the data is the JSON null
  if (data.plans.length) await db.insert(s.practicePlans).values(data.plans.map((p) => ({ ...p, answers: p.answers ?? sql`'null'::jsonb` })));
  if (data.planBlocks.length) await db.insert(s.practicePlanBlocks).values(data.planBlocks);
}

libraryRepoContract(async (data) => {
  await load(data);
  return drizzleLibraryRepo(db);
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
  test("setPlanBlocks replaces the plan's rows", async () => {
    await fresh();
    await repo.addBlocks(null, [block("a"), block("b"), block("c")], NOW);
    await db.insert(schema.practicePlans).values(["p", "q"].map((id) => ({ id, title: id, answers: {}, model: "m", reply: "", source: "test" })));
    await repo.setPlanBlocks("p", [{ day: 0, place: 0, blockId: "a", minutes: 5 }, { day: 0, place: 1, blockId: "b", minutes: 5 }]);
    await repo.setPlanBlocks("q", [{ day: 0, place: 0, blockId: "a", minutes: 1 }]);
    await repo.setPlanBlocks("p", [{ day: 1, place: 0, blockId: "c", minutes: 10 }]);
    const rows = async (planId: string) =>
      db.select({ day: schema.practicePlanBlocks.day, place: schema.practicePlanBlocks.place, blockId: schema.practicePlanBlocks.blockId, minutes: schema.practicePlanBlocks.minutes })
        .from(schema.practicePlanBlocks).where(eq(schema.practicePlanBlocks.planId, planId));
    assert.deepEqual(await rows("p"), [{ day: 1, place: 0, blockId: "c", minutes: 10 }]);
    assert.equal((await rows("q")).length, 1);
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
    assert.deepEqual(await repo.upsertCurated([curated("guitar-a-b", ["beginner", "new"])], NOW), { blocks: 1, choices: 2, deactivated: 0 });
    const [b] = await db.select().from(schema.blocks);
    assert.deepEqual([b.kind, b.level, b.steps, b.tags, b.why, b.minutes, b.model], ["curated", null, [], ["technique"], "w", 4, "m1"]);
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
  test("setPlanBlocks writes a curated slot's choice id", async () => {
    await fresh();
    await repo.upsertCurated([curated("guitar-a-b", ["beginner"])], NOW);
    await db.insert(schema.practicePlans).values({ id: "p", title: "p", answers: {}, model: "m", reply: "", source: "test" });
    await repo.setPlanBlocks("p", [{ day: 0, place: 0, blockId: "guitar-a-b", choiceId: "guitar-a-b/beginner", minutes: 6 }]);
    const rows = await db.select({ blockId: schema.practicePlanBlocks.blockId, choiceId: schema.practicePlanBlocks.choiceId, minutes: schema.practicePlanBlocks.minutes }).from(schema.practicePlanBlocks);
    assert.deepEqual(rows, [{ blockId: "guitar-a-b", choiceId: "guitar-a-b/beginner", minutes: 6 }]);
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
  test("ownCurated adds the player's owner row only for a stored block, writes no block row, and twice adds one", async () => {
    await fresh();
    await repo.upsertCurated([curated("guitar-a-b", ["beginner"])], NOW);
    const blocksBefore = await db.select().from(schema.blocks);
    await repo.ownCurated(PLAYER_A, ["guitar-a-b", "guitar-unknown-one"], NOW);
    await repo.ownCurated(PLAYER_A, ["guitar-a-b"], NOW);
    assert.deepEqual(await db.select().from(schema.blocks), blocksBefore);
    const owners = await db.select().from(schema.blockOwners).where(eq(schema.blockOwners.userId, PLAYER_A));
    assert.deepEqual(owners.map((o) => o.blockId), ["guitar-a-b"]);
  });
});
