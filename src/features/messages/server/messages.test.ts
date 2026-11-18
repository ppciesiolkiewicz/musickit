import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryMessagesRepo } from "./repo.memory";
import { addContactMessage, adminReply, markRead, postMessage, setStatus, userThread, userThreads, type Mail, type Mailer } from "./messages";

const t = (min: number) => new Date(Date.UTC(2026, 10, 18, 12, min));
const jo = { id: "u1", email: "jo@example.com", name: "Jo" };
const al = { id: "u2", email: "al@example.com", name: "Al" };

function setup() {
  const repo = memoryMessagesRepo();
  const sent: Mail[] = [];
  const mailer: Mailer = async (m) => void sent.push(m);
  return { repo, sent, mailer };
}

test("a first message starts a thread and emails us; newThread starts another", async () => {
  const { repo, sent, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "This step is unclear", context: { path: "/plan", selection: "Play it" } }, t(0), {});
  assert.ok(a.ok);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /This step is unclear/);
  assert.match(sent[0].text, /\/plan/);
  assert.match(sent[0].text, new RegExp(`/dev/messages\\?thread=${a.threadId}`));
  assert.equal(sent[0].reply_to, "jo@example.com");
  const b = await postMessage(repo, mailer, jo, { body: "Another thing", newThread: true }, t(1), {});
  assert.ok(b.ok);
  assert.notEqual(b.threadId, a.threadId);
  assert.equal((await userThreads(repo, jo.id)).threads.length, 2);
});

test("without a threadId a message goes into the newest thread", async () => {
  const { repo, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "one" }, t(0), {});
  const b = await postMessage(repo, mailer, jo, { body: "two" }, t(1), {});
  assert.ok(a.ok && b.ok);
  assert.equal(b.threadId, a.threadId);
});

test("another user's thread is not found, for posting and reading", async () => {
  const { repo, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "mine" }, t(0), {});
  assert.ok(a.ok);
  const r = await postMessage(repo, mailer, al, { body: "sneak", threadId: a.threadId }, t(1), {});
  assert.deepEqual(r, { ok: false, status: 404, error: "That conversation wasn't found." });
  assert.equal((await repo.messagesOf(a.threadId)).length, 1);
  assert.equal(await userThread(repo, al.id, a.threadId), null);
  assert.equal(await markRead(repo, al.id, a.threadId, t(2)), false);
});

test("writing in a closed thread reopens it", async () => {
  const { repo, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "hi" }, t(0), {});
  assert.ok(a.ok);
  assert.equal(await setStatus(repo, a.threadId, "closed"), true);
  await postMessage(repo, mailer, jo, { body: "again", threadId: a.threadId }, t(1), {});
  assert.equal((await repo.thread(a.threadId))?.status, "open");
});

test("we are emailed once per thread in 10 minutes", async () => {
  const { repo, sent, mailer } = setup();
  await postMessage(repo, mailer, jo, { body: "1" }, t(0), {});
  await postMessage(repo, mailer, jo, { body: "2" }, t(1), {});
  await postMessage(repo, mailer, jo, { body: "3" }, t(11), {});
  assert.equal(sent.length, 2);
});

test("a failing mailer still stores the message", async () => {
  const { repo } = setup();
  const r = await postMessage(repo, async () => { throw new Error("resend 500"); }, jo, { body: "hi" }, t(0), {});
  assert.ok(r.ok);
  assert.equal((await repo.messagesOf(r.threadId)).length, 1);
});

test("a bad body is refused", async () => {
  const { repo, mailer } = setup();
  const r = await postMessage(repo, mailer, jo, { body: "  " }, t(0), {});
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.status, 400);
});

test("our reply is unread for the user until they read it", async () => {
  const { repo, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "hi" }, t(0), {});
  assert.ok(a.ok);
  assert.deepEqual(await adminReply(repo, a.threadId, "Fixed, thanks.", t(1)), { ok: true });
  let u = await userThreads(repo, jo.id);
  assert.equal(u.unread, 1);
  assert.equal(u.threads[0].unread, true);
  assert.equal(u.threads[0].preview, "Fixed, thanks.");
  const th = await userThread(repo, jo.id, a.threadId);
  assert.deepEqual(th?.messages.map((m) => [m.fromAdmin, m.body]), [[false, "hi"], [true, "Fixed, thanks."]]);
  assert.equal(await markRead(repo, jo.id, a.threadId, t(2)), true);
  u = await userThreads(repo, jo.id);
  assert.equal(u.unread, 0);
});

test("a contact message is its own thread, with no extra email; we can't reply to a visitor in the app", async () => {
  const { repo, sent } = setup();
  const id = await addContactMessage(repo, { email: "x@example.com", message: "Hello", source: "schools", at: t(0).getTime() }, null);
  const th = await repo.thread(id);
  assert.equal(th?.userId, null);
  assert.equal(th?.email, "x@example.com");
  assert.deepEqual((await repo.messagesOf(id))[0].context, { source: "schools", email: "x@example.com" });
  assert.equal(sent.length, 0);
  const r = await adminReply(repo, id, "hi", t(1));
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.status, 400);
});

test("a signed-in contact message starts a new thread of theirs", async () => {
  const { repo } = setup();
  await addContactMessage(repo, { email: "other@example.com", message: "Hi", source: "faq", at: t(0).getTime() }, jo.id);
  const u = await userThreads(repo, jo.id);
  assert.equal(u.threads.length, 1);
});

test("status must be open or closed", async () => {
  const { repo, mailer } = setup();
  const a = await postMessage(repo, mailer, jo, { body: "hi" }, t(0), {});
  assert.ok(a.ok);
  assert.equal(await setStatus(repo, a.threadId, "gone"), false);
  assert.equal(await setStatus(repo, "nope", "closed"), false);
});
