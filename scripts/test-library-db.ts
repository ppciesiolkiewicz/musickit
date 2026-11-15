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
import type { NewBlock, Provenance } from "../src/features/userData/server/repo";

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
  if (data.owners.length) await db.insert(s.blockOwners).values(data.owners);
  if (data.progress.length) await db.insert(s.progressEntries).values(data.progress);
  if (data.dayTimes.length) await db.insert(s.planDayTimes).values(data.dayTimes.map((t) => ({ ...t, spent: t.spent ?? sql`'null'::jsonb` })));
  // `answers` is NOT NULL jsonb: a null in the data is the JSON null
  if (data.plans.length) await db.insert(s.practicePlans).values(data.plans.map((p) => ({ ...p, answers: p.answers ?? sql`'null'::jsonb` })));
  if (data.planBlocks.length) await db.insert(s.practicePlanBlocks).values(data.planBlocks);
  if (data.reviews.length) await db.insert(s.planReviews).values(data.reviews);
}

libraryRepoContract(async (data) => {
  await load(data);
  return drizzleLibraryRepo(db);
});

describe("user data repo on Postgres: block provenance", () => {
  const NOW = new Date(2026, 10, 15, 12);
  const key = (title: string): BlockKey => ({ content: { title, cells: [] } }) as unknown as BlockKey;
  const block = (id: string, extra: Partial<NewBlock> = {}): NewBlock => ({ id, key: key(id), parentId: null, source: "ai", enabledForReuse: false, ...extra });
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
  test("promoteExampleBlocks makes the app's example rows seed, enabled, and leaves every other row", async () => {
    await fresh();
    await repo.addBlocks(null, [block("ex", { source: "example" }), block("off", { source: "seed" }), block("on", { source: "seed", enabledForReuse: true })], NOW);
    await repo.addBlocks(PLAYER_A, [block("ex", { source: "example" })], NOW);
    assert.equal(await repo.promoteExampleBlocks(["ex", "off", "on", "ex", "missing"]), 1);
    assert.equal(await repo.promoteExampleBlocks([]), 0);
    const owners = await db.select({ userId: schema.blockOwners.userId, blockId: schema.blockOwners.blockId, source: schema.blockOwners.source, enabled: schema.blockOwners.enabledForReuse }).from(schema.blockOwners);
    const of = (userId: string | null, blockId: string) => owners.find((o) => o.userId === userId && o.blockId === blockId);
    assert.deepEqual([of(null, "ex")?.source, of(null, "ex")?.enabled], ["seed", true]);
    assert.deepEqual([of(null, "off")?.source, of(null, "off")?.enabled], ["seed", false]);
    assert.deepEqual([of(PLAYER_A, "ex")?.source, of(PLAYER_A, "ex")?.enabled], ["example", false]);
  });
});
