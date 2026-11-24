import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ANSWERS } from "@/features/plan/intake/answers";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "@/features/plan/model/types";
import { memoryReminderRepo } from "./repo.memory";
import { runReminders, type RunDeps } from "./run";
import { cronRoute, offRoute } from "./http";
import { offToken } from "./token";

const NOW = new Date("2026-11-18T18:05:00Z");
const ex = { title: "A", minutes: 5, cells: [] };
const today = (done: boolean): StoredPlan => ({
  id: "p", startedOn: "2026-11-18", done: done ? { "0:0": true } : {}, composed: { attempt: 0, declined: [], short: false },
  config: { title: "t", days: [{ theme: "Scales", exercises: [ex] }] } as unknown as PlanConfig,
});
const week: StoredPlan = {
  id: "w", startedOn: "2026-11-16", done: {}, teacher: { madeAt: "2026-11-16T09:00:00.000Z" },
  config: { title: "", days: Array.from({ length: 7 }, () => ({ theme: "", exercises: [ex] })) } as unknown as PlanConfig,
};

async function setup(opts: { plan?: PlanState; taught?: boolean; mail?: RunDeps["mail"]; account?: boolean } = {}) {
  const repo = memoryReminderRepo();
  await repo.put("u1", { enabled: true, time: "18:00", zone: "UTC" }, NOW);
  const sent: string[][] = [];
  let plan = opts.plan ?? { ...EMPTY_STATE, answers: DEFAULT_ANSWERS };
  const deps: RunDeps = {
    repo,
    planOf: async () => plan,
    accountOf: async () => (opts.account === false ? null : { email: "a@b.c", taught: !!opts.taught }),
    mail: opts.mail ?? (async (m) => { sent.push(m.to); return "sent"; }),
    base: "https://x.app", offSecret: "s", env: {},
  };
  return { repo, deps, sent, setPlan: (p: PlanState) => { plan = p; } };
}

test("sends one email to a due player, and not again in the same hour", async () => {
  const { deps, sent } = await setup();
  assert.deepEqual(await runReminders(deps, NOW), { due: 1, emailed: 1, skipped: 0, failed: 0 });
  assert.deepEqual(sent, [["a@b.c"]]);
  assert.equal((await runReminders(deps, new Date("2026-11-18T18:20:00Z"))).emailed, 0);
  assert.equal(sent.length, 1);
});

test("two runs at once send one email", async () => {
  const { deps, sent } = await setup();
  await Promise.all([runReminders(deps, NOW), runReminders(deps, NOW)]);
  assert.equal(sent.length, 1);
});

test("today's plan finished: skipped, nothing claimed, a later run after un-finishing sends", async () => {
  const { deps, sent, repo, setPlan } = await setup({ plan: { ...EMPTY_STATE, answers: DEFAULT_ANSWERS, current: today(true) } });
  assert.equal((await runReminders(deps, NOW)).skipped, 1);
  assert.equal((await repo.get("u1"))?.sentOn, null);
  setPlan({ ...EMPTY_STATE, answers: DEFAULT_ANSWERS, current: today(false) });
  await runReminders(deps, NOW);
  assert.equal(sent.length, 1);
});

test("a teacher's student with today's day open gets one", async () => {
  const { deps, sent } = await setup({ taught: true, plan: { ...EMPTY_STATE, given: [week] } });
  await runReminders(deps, NOW);
  assert.equal(sent.length, 1);
});

test("a failed send is undone, counted, and the next run sends", async () => {
  let fail = true;
  const { deps, repo } = await setup({ mail: async () => { if (fail) throw new Error("resend 500"); return "sent"; } });
  assert.deepEqual(await runReminders(deps, NOW), { due: 1, emailed: 0, skipped: 0, failed: 1 });
  assert.equal((await repo.get("u1"))?.sentOn, null);
  fail = false;
  assert.equal((await runReminders(deps, NOW)).emailed, 1);
});

test("a deleted account is skipped, no throw", async () => {
  const { deps } = await setup({ account: false });
  assert.equal((await runReminders(deps, NOW)).skipped, 1);
});

test("cron route: 503 without the secret, 401 with a wrong bearer, 200 with the counts", async () => {
  const { deps } = await setup();
  const req = (auth?: string) => new Request("https://x.app/api/cron/reminders", { method: "POST", headers: auth ? { authorization: auth } : {} });
  assert.equal((await cronRoute(() => deps, req("Bearer c"), {}, NOW)).status, 503);
  assert.equal((await cronRoute(() => deps, req("Bearer wrong"), { CRON_SECRET: "c" }, NOW)).status, 401);
  const ok = await cronRoute(() => deps, req("Bearer c"), { CRON_SECRET: "c" }, NOW);
  assert.equal(ok.status, 200);
  assert.equal(((await ok.json()) as { emailed: number }).emailed, 1);
});

test("off route: a good token turns the reminder off; a bad one answers 400", async () => {
  const { repo } = await setup();
  const at = (t: string) => new Request(`https://x.app/api/reminders/off?token=${encodeURIComponent(t)}`, { method: "POST" });
  assert.equal((await offRoute(repo, at("u1.nope"), { REMINDER_UNSUBSCRIBE_SECRET: "s" }, NOW)).status, 400);
  assert.equal((await offRoute(repo, at(offToken("u1", "s")), { REMINDER_UNSUBSCRIBE_SECRET: "s" }, NOW)).status, 200);
  assert.equal((await repo.get("u1"))?.enabled, false);
});

test("repo: a new time clears sentOn, the same time keeps it", async () => {
  const { repo } = await setup();
  assert.equal(await repo.claim("u1", "2026-11-18"), true);
  assert.equal(await repo.claim("u1", "2026-11-18"), false);
  await repo.put("u1", { enabled: true, time: "18:00", zone: "UTC" }, NOW);
  assert.equal((await repo.get("u1"))?.sentOn, "2026-11-18");
  await repo.put("u1", { enabled: true, time: "19:00", zone: "UTC" }, NOW);
  assert.equal((await repo.get("u1"))?.sentOn, null);
});
