import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNTS_KEY, SESSION_KEY, accountKey, accountsOn, localAccountStore, sessionId } from "./localAccountStore";

/** Run with a fake window.localStorage over a Map. */
async function withStorage(run: (data: Map<string, string>) => Promise<void>) {
  const data = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  const had = g.window;
  const storage = new Proxy(
    {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
    { ownKeys: () => [...data.keys()], getOwnPropertyDescriptor: (_t, k) => (data.has(String(k)) ? { enumerable: true, configurable: true, value: data.get(String(k)) } : undefined) },
  );
  g.window = { localStorage: storage };
  try {
    await run(data);
  } finally {
    g.window = had;
  }
}

test("accounts are off in production only", () => {
  assert.equal(accountsOn({ NODE_ENV: "production" }), false);
  assert.equal(accountsOn({ NODE_ENV: "development" }), true);
  assert.equal(accountsOn({}), true);
});

test("signed out, data keys are the shared ones; signed in, the account's own", async () => {
  await withStorage(async () => {
    assert.equal(sessionId(), null);
    assert.equal(await localAccountStore.current(), null);
    assert.equal(accountKey("musickit.plan"), "musickit.plan");

    const made = await localAccountStore.create({ name: "Tom", email: "tom@school.test", role: "teacher" });
    assert.ok(made.ok);
    assert.equal(sessionId(), null, "making an account does not sign it in");

    assert.equal(await localAccountStore.signIn("nobody"), false);
    assert.equal(await localAccountStore.signIn(made.account.id), true);
    assert.equal((await localAccountStore.current())?.email, "tom@school.test");
    assert.equal(accountKey("musickit.plan"), `musickit.plan@${made.account.id}`);

    await localAccountStore.signOut();
    assert.equal(accountKey("musickit.plan"), "musickit.plan");
  });
});

test("one account per email", async () => {
  await withStorage(async () => {
    assert.ok((await localAccountStore.create({ name: "Tom", email: "tom@school.test", role: "teacher" })).ok);
    assert.deepEqual(await localAccountStore.create({ name: "Tim", email: "Tom@school.test", role: "student" }), { ok: false, error: "taken" });
    assert.equal((await localAccountStore.list()).length, 1);
  });
});

test("removing an account signs it out and clears only its own data", async () => {
  await withStorage(async (data) => {
    const a = await localAccountStore.create({ name: "Ann", email: "ann@school.test", role: "student" });
    const b = await localAccountStore.create({ name: "Bea", email: "bea@school.test", role: "student" });
    assert.ok(a.ok && b.ok);
    await localAccountStore.signIn(a.account.id);
    data.set("musickit.plan", "shared");
    data.set(`musickit.plan@${a.account.id}`, "ann");
    data.set(`musickit.plan@${b.account.id}`, "bea");

    await localAccountStore.remove(a.account.id);
    assert.equal(sessionId(), null);
    assert.equal(data.has(SESSION_KEY), false);
    assert.equal(data.has(`musickit.plan@${a.account.id}`), false);
    assert.equal(data.get(`musickit.plan@${b.account.id}`), "bea");
    assert.equal(data.get("musickit.plan"), "shared");
    assert.equal(JSON.parse(data.get(ACCOUNTS_KEY)!).length, 1);
  });
});

test("a session pointing at a deleted account counts as signed out", async () => {
  await withStorage(async (data) => {
    data.set(SESSION_KEY, "gone");
    assert.equal(sessionId(), null);
    assert.equal(accountKey("musickit.progress"), "musickit.progress");
  });
});
