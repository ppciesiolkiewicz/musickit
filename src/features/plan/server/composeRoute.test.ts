import { test } from "node:test";
import assert from "node:assert/strict";
import { startSession, type AuthDeps } from "@/features/account/server/auth";
import { memoryRepo } from "@/features/account/server/repo.memory";
import type { Plan } from "@/features/account/plans";
import { TAUGHT_PLAN_ID } from "@/features/account/plans";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { readDocVersioned, writeDoc } from "@/features/userData/server/data";
import { EMPTY_STATE } from "../model/types";
import { composeRoute, type ComposeHttpDeps } from "./composeRoute";
import { stubLibrary, topicBlocks } from "./stubLibrary";

const T0 = new Date("2026-11-18T12:00:00.000Z");
const TODAY = "2026-11-18";
const ANSWERS = { areas: ["guitar"], topics: { "guitar-scales": 1 }, minutes: 10, styles: "", notes: "" };
const plan = (id: string, role: Plan["role"]): Plan => ({ id, name: id, role, monthCents: 0, yearCents: 0, trialDays: 0, students: null, extraStudents: 0, autoplansPerMonth: 0, batch: false, enabled: true, sort: 1 });

async function setup() {
  const store = memoryRepo([plan("student-x", "student"), plan(TAUGHT_PLAN_ID, "student")]);
  const userData = memoryUserDataRepo();
  let n = 0;
  const auth: AuthDeps = { repo: store.repo, now: () => T0, token: () => `tok${++n}`, code: () => "100000" };
  const h: ComposeHttpDeps = { auth, userData, library: stubLibrary(topicBlocks("guitar-scales")), today: () => TODAY };
  async function user(email: string, planId: string) {
    const made = await store.repo.createUser({ email, name: "Ben", role: "student" }, T0);
    assert.ok(made);
    const row = await store.repo.setUserPlan(made.id, planId, "year", "student", T0);
    assert.ok(row);
    await writeDoc(userData, made.id, "plan", { ...EMPTY_STATE, answers: ANSWERS }, T0);
    const s = await startSession(auth, row, null, null, false);
    return { id: made.id, cookie: `mk_session=${s.sessionToken}` };
  }
  return { h, userData, user };
}

const post = (cookie: string, body: unknown) =>
  new Request("http://localhost:3000/api/me/plan/compose", {
    method: "POST",
    headers: { host: "localhost:3000", origin: "http://localhost:3000", cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("a teacher's student is refused with 409 taught and a plain line; their document is not read or changed", async () => {
  const s = await setup();
  const ben = await s.user("ben@home.com", TAUGHT_PLAN_ID);
  const before = await readDocVersioned(s.userData, ben.id, "plan");
  for (const another of [false, true]) {
    const r = await composeRoute(s.h, post(ben.cookie, { date: TODAY, another }));
    assert.equal(r.status, 409);
    const body = (await r.json()) as { code: string; error: string };
    assert.equal(body.code, "taught");
    assert.match(body.error, /^Your teacher makes your plans/);
  }
  assert.deepEqual(await readDocVersioned(s.userData, ben.id, "plan"), before);
});

test("a player with answers gets today's plan", async () => {
  const s = await setup();
  const ann = await s.user("ann@home.com", "student-x");
  const r = await composeRoute(s.h, post(ann.cookie, { date: TODAY, another: false }));
  assert.equal(r.status, 200);
  const body = (await r.json()) as { ok: boolean; date: string };
  assert.equal(body.ok, true);
  assert.equal(body.date, TODAY);
});

test("signed out is 401, before anything else", async () => {
  const s = await setup();
  assert.equal((await composeRoute(s.h, post("mk_session=nope", { date: TODAY, another: false }))).status, 401);
});
