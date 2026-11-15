import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocClient } from "@/features/userData/client/docClient";
import { LoadRefused, loadReporter } from "@/features/userData/client/load";
import { worstStatus } from "@/features/userData/client/registry";
import type { Block } from "@/features/plan/model/types";
import { createServerNoteStore } from "./serverNoteStore";
import { memoryNoteStore } from "./noteStore";

const note = (title: string): Block => ({ title, cells: [] });
const ok = () => createDocClient({ put: async () => new Response(null, { status: 200 }), schedule: () => () => {} });

test("nothing stored is null; a stored note is read", async () => {
  assert.equal(await createServerNoteStore({ get: async () => ({ data: null }) }).load(), null);
  assert.equal((await createServerNoteStore({ get: async () => ({ data: note("Hi") }) }).load())?.title, "Hi");
});

test("loads share one GET, and a load after a save gets the saved note", async () => {
  let gets = 0;
  const store = createServerNoteStore({ client: ok(), get: async () => (gets++, { data: note("A") }) });
  await Promise.all([store.load(), store.load()]);
  await store.save(note("B"));
  assert.equal((await store.load())?.title, "B");
  assert.equal(gets, 1);
});

test("a save made while the read is out wins", async () => {
  let answer!: (v: unknown) => void;
  const store = createServerNoteStore({ client: ok(), get: () => new Promise((r) => (answer = r)) });
  const loading = store.load();
  await store.save(note("new"));
  answer({ data: note("old") });
  assert.equal((await loading)?.title, "new");
});

test("a refused read rejects, is not kept, and the next load asks again", async () => {
  let gets = 0;
  const store = createServerNoteStore({ get: async () => { if (++gets === 1) throw new Error("401"); return { data: null }; } });
  await assert.rejects(store.load());
  assert.equal(await store.load(), null);
  assert.equal(gets, 2);
});

test("memoryNoteStore keeps a note per store", async () => {
  const a = memoryNoteStore();
  await a.save(note("x"));
  assert.equal((await a.load())?.title, "x");
  assert.equal(await memoryNoteStore().load(), null);
});

test("flush sends a save still waiting on the delay at once, before a share reads the stored note", async () => {
  const sent: unknown[] = [];
  const client = createDocClient({ put: async (body) => (sent.push(body), new Response(null, { status: 200 })), schedule: () => () => {} });
  const store = createServerNoteStore({ client, get: async () => ({ data: null }) });
  await store.save(note("B"));
  assert.equal(sent.length, 0);
  assert.equal(await store.flush?.(), true);
  assert.deepEqual(sent, [note("B")]);
});

test("flush is false when the save didn't land", async () => {
  const client = createDocClient({ put: async () => new Response(null, { status: 503 }), schedule: () => () => {} });
  const store = createServerNoteStore({ client, get: async () => ({ data: null }) });
  await store.save(note("B"));
  assert.equal(await store.flush?.(), false);
});

test("a refused read of the note shows in the save notice, so the creator isn't left blank with no word", async () => {
  let refuse = true;
  const loads = loadReporter();
  const store = createServerNoteStore({ get: async () => { if (refuse) throw new LoadRefused(401); return { data: null }; }, loads });
  await assert.rejects(store.load());
  assert.equal(loads.status(), "signedOut");
  assert.equal(worstStatus(), "signedOut", "the notice hears it");
  refuse = false;
  assert.equal(await store.load(), null);
  assert.equal(loads.status(), "saved");
});
