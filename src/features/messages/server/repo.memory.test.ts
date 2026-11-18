import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryMessagesRepo } from "./repo.memory";

const t = (min: number) => new Date(Date.UTC(2026, 10, 18, 12, min));

test("adding a message bumps the thread's times for the side that wrote", async () => {
  const repo = memoryMessagesRepo();
  const th = await repo.createThread({ userId: "u1", email: null, at: t(0) });
  await repo.addMessage({ threadId: th.id, fromAdmin: false, body: "hi", context: null, at: t(1) });
  let now = await repo.thread(th.id);
  assert.deepEqual([now?.lastAt, now?.lastUserAt, now?.lastAdminAt], [t(1), t(1), null]);
  await repo.addMessage({ threadId: th.id, fromAdmin: true, body: "hello", context: null, at: t(2) });
  now = await repo.thread(th.id);
  assert.deepEqual([now?.lastAt, now?.lastUserAt, now?.lastAdminAt], [t(2), t(1), t(2)]);
  assert.deepEqual((await repo.messagesOf(th.id)).map((m) => m.body), ["hi", "hello"]);
  assert.equal((await repo.lastMessage(th.id))?.body, "hello");
});

test("a user's threads are theirs only, newest first", async () => {
  const repo = memoryMessagesRepo();
  const a = await repo.createThread({ userId: "u1", email: null, at: t(0) });
  const b = await repo.createThread({ userId: "u1", email: null, at: t(1) });
  await repo.createThread({ userId: "u2", email: null, at: t(2) });
  await repo.addMessage({ threadId: a.id, fromAdmin: false, body: "later", context: null, at: t(5) });
  assert.deepEqual((await repo.threadsOf("u1")).map((x) => x.id), [a.id, b.id]);
});

test("all threads filter by status and carry the last message's preview and the user", async () => {
  const repo = memoryMessagesRepo(new Map([["u1", { email: "jo@example.com", name: "Jo" }]]));
  const a = await repo.createThread({ userId: "u1", email: null, at: t(0) });
  const b = await repo.createThread({ userId: null, email: "x@example.com", at: t(1) });
  await repo.addMessage({ threadId: a.id, fromAdmin: false, body: "first\nmore", context: null, at: t(2) });
  await repo.addMessage({ threadId: b.id, fromAdmin: false, body: "contact", context: null, at: t(3) });
  await repo.updateThread(b.id, { status: "closed" });
  const open = await repo.allThreads({ status: "open", limit: 50 });
  assert.equal(open.length, 1);
  assert.equal(open[0].preview, "first");
  assert.equal(open[0].userEmail, "jo@example.com");
  assert.equal(open[0].userName, "Jo");
  const all = await repo.allThreads({ limit: 50 });
  assert.deepEqual(all.map((x) => x.id), [b.id, a.id]);
  assert.equal(all[0].userEmail, null);
});
