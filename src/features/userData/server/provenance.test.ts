import { test } from "node:test";
import assert from "node:assert/strict";
import type { BlockKey } from "@/features/plan/model/blockId";
import type { NewBlock, Provenance } from "./repo";
import { memoryUserDataRepo } from "./repo.memory";

const NOW = new Date(2026, 10, 15, 12);
const key = (title: string): BlockKey => ({ content: { title, cells: [] } }) as unknown as BlockKey;
const block = (id: string, extra: Partial<NewBlock> = {}): NewBlock => ({ id, key: key(id), parentId: null, source: "ai", ...extra });
const prov = (p: Partial<Provenance>): Provenance => ({ model: null, promptVersion: null, docsAgents: null, docsTeaching: null, ...p });
const full = prov({ model: "m1", promptVersion: 3, docsAgents: 2, docsTeaching: 2 });

test("addBlocks stores provenance, and a later one for the same id leaves the first", async () => {
  const repo = memoryUserDataRepo();
  await repo.addBlocks(null, [block("a", { provenance: full })], NOW);
  await repo.addBlocks("u", [block("a", { provenance: prov({ model: "m2", promptVersion: 9 }) })], NOW);
  assert.deepEqual(repo.peekBlocks().get("a")?.provenance, full);
});

test("a block stored without provenance is filled by a later addBlocks that has one", async () => {
  const repo = memoryUserDataRepo();
  await repo.addBlocks("u", [block("a")], NOW);
  assert.deepEqual(repo.peekBlocks().get("a")?.provenance, prov({}));
  await repo.addBlocks("u", [block("a", { provenance: full })], NOW);
  assert.deepEqual(repo.peekBlocks().get("a")?.provenance, full);
});

test("a block with only a model set is not filled", async () => {
  const repo = memoryUserDataRepo();
  await repo.addBlocks("u", [block("a", { provenance: prov({ model: "m1" }) })], NOW);
  await repo.addBlocks("u", [block("a", { provenance: full })], NOW);
  assert.deepEqual(repo.peekBlocks().get("a")?.provenance, prov({ model: "m1" }));
});

test("a block with a parent and no provenance takes the parent's when the parent is stored", async () => {
  const repo = memoryUserDataRepo();
  await repo.addBlocks("u", [block("p", { provenance: full }), block("c", { parentId: "p" })], NOW);
  assert.deepEqual(repo.peekBlocks().get("c")?.provenance, full);
});

test("a block with a parent keeps its own provenance", async () => {
  const repo = memoryUserDataRepo();
  const own = prov({ model: "mine" });
  await repo.addBlocks("u", [block("p", { provenance: full }), block("c", { parentId: "p", provenance: own })], NOW);
  assert.deepEqual(repo.peekBlocks().get("c")?.provenance, own);
});

