import { test } from "node:test";
import assert from "node:assert/strict";
import { toAccount, type AuthDeps } from "@/features/account/server/auth";
import { memoryRepo } from "@/features/account/server/repo.memory";
import type { Plan } from "@/features/account/plans";
import type { Account } from "@/features/account/model";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { readDocVersioned, writeDoc } from "@/features/userData/server/data";
import type { UserDataRepo } from "@/features/userData/server/repo";
import { stepAt } from "@/features/plan/model/path";
import { addDays, ratePlan, updateGiven } from "@/features/plan/model/schedule";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanConfig, PlanState, StoredPlan } from "@/features/plan/model/types";
import { MAX_PLAN_BYTES } from "@/features/userData/model";
import { stubBlock, stubLibrary, topicBlocks } from "@/features/plan/server/stubLibrary";
import { addStudent } from "./students";
import { makeWeek, studentView } from "./plans";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const TODAY = "2026-11-18";
const plan = (id: string): Plan => ({ id, name: id, role: "teacher", monthCents: 0, yearCents: 0, trialDays: 0, students: null, extraStudents: 0, autoplansPerMonth: 0, batch: false, enabled: true, sort: 1 });
const ANSWERS = { areas: ["guitar"], topics: { "guitar-scales": 1 }, minutes: 10, styles: "", notes: "" };

async function teacherOf(store: ReturnType<typeof memoryRepo>, email: string, time: Date): Promise<Account> {
  const made = await store.repo.createUser({ email, name: email, role: "student" }, time);
  assert.ok(made);
  const row = await store.repo.setUserPlan(made.id, "teacher-x", "year", "teacher", time);
  assert.ok(row);
  return toAccount(row);
}

/** A teacher with one student (answers in their document), another teacher, and a library of guitar-scales blocks. */
async function setup(opts: { userData?: UserDataRepo; blocks?: ReturnType<typeof topicBlocks> } = {}) {
  const store = memoryRepo([plan("teacher-x")]);
  const base = memoryUserDataRepo();
  let n = 0;
  const auth: AuthDeps = { repo: store.repo, now: () => new Date("2026-11-01T12:00:00Z"), token: () => `t${++n}`, code: () => "100000" };
  const teacher = await teacherOf(store, "tess@school.com", new Date("2026-11-01T12:00:00Z"));
  const other = await teacherOf(store, "otto@school.com", new Date("2026-11-01T12:00:00Z"));
  const added = await addStudent({ auth, userData: base }, teacher, { name: "Ben", email: "ben@home.com", answers: ANSWERS, today: "2026-11-18" });
  assert.ok(added.ok);
  const library = stubLibrary(opts.blocks ?? topicBlocks("guitar-scales"));
  let id = 0;
  return {
    teacher, other, studentId: added.studentId, base, library,
    d: { auth, userData: opts.userData ?? base, library },
    newId: () => `p${++id}`,
    doc: async () => readDocVersioned(base, added.studentId, "plan") as Promise<{ data: PlanState; version: number }>,
    put: async (s: PlanState) => assert.ok((await writeDoc(base, added.studentId, "plan", s, NOW)).ok),
  };
}

const ok = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
};
const week = (s: PlanState, id: string) => s.given.find((p) => p.id === id) ?? s.history.find((p) => p.id === id);
const levelsOf = (p: StoredPlan) => new Set(p.config.days.flatMap((d) => d.exercises.flatMap((e) => e.steps ?? [])).map((r) => stepAt(r)!.step.level));

test("a first week starts today: seven days first in given, made by the teacher; answers and history kept", async () => {
  const s = await setup();
  const before = await s.doc();
  const r = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  assert.equal(r.start, TODAY);
  assert.equal(r.short, false);
  const after = await s.doc();
  assert.equal(after.version, before.version + 1);
  const p = after.data.given[0];
  assert.equal(p.id, r.planId);
  assert.equal(p.startedOn, TODAY);
  assert.deepEqual(p.teacher, { madeAt: NOW.toISOString() });
  assert.equal(p.config.days.length, 7);
  assert.deepEqual(after.data.answers, before.data.answers);
  assert.deepEqual(after.data.answersHistory, before.data.answersHistory);
  assert.deepEqual(after.data.teacherScores, [], "no slider sent, no score recorded");
  assert.equal(s.library.calls[0].player, s.studentId);
});

test("next after a running week starts the day after its last day; after an ended week, today", async () => {
  const s = await setup();
  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-15", rotate: false }, new Date("2026-11-15T12:00:00Z"), s.newId));
  assert.equal(first.start, "2026-11-15");
  const next = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  assert.equal(next.start, "2026-11-22");
  const doc = (await s.doc()).data;
  assert.deepEqual(doc.given.map((p) => p.id), [next.planId, first.planId], "nothing replaced");
  // the week of the 22nd has ended by 2026-12-01
  const later = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-12-01", rotate: false }, new Date("2026-12-01T12:00:00Z"), s.newId));
  assert.equal(later.start, "2026-12-01");
});

test("rotate keeps the running week's start and replaces it; its ratings go with it to history", async () => {
  const s = await setup();
  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  const rated = updateGiven((await s.doc()).data, first.planId, (p) => ratePlan(p, 0, 0, 4, "2026-11-16T18:00:00Z"));
  await s.put(rated);
  const rot = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true }, NOW, s.newId));
  assert.equal(rot.start, "2026-11-16");
  const doc = (await s.doc()).data;
  assert.deepEqual(doc.given.map((p) => p.id), [rot.planId]);
  assert.equal(doc.history[0].id, first.planId);
  assert.equal(doc.history[0].rated?.["0:0"]?.stars, 4);
});

test("rotate with no running week is next starting today", async () => {
  const s = await setup();
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-01", rotate: false }, new Date("2026-11-01T12:00:00Z"), s.newId));
  const r = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true }, NOW, s.newId));
  assert.equal(r.start, TODAY);
  assert.equal((await s.doc()).data.given.length, 2, "the ended week is not replaced");
  const fresh = await setup();
  assert.equal(ok(await makeWeek(fresh.d, fresh.teacher, fresh.studentId, { today: TODAY, rotate: true }, NOW, fresh.newId)).start, TODAY);
});

test("scores are recorded only for moved sliders of the student's areas, and pace the week", async () => {
  const s = await setup();
  const view = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  const now = (t: string) => view.topics.find((x) => x.topic === t)!.now;
  const r = ok(await makeWeek(s.d, s.teacher, s.studentId, {
    today: TODAY, rotate: false,
    scores: {
      "guitar-scales": 2, // moved
      "guitar-caged": now("guitar-caged"), // sent as it was: not a move
      "guitar-techniques": now("guitar-techniques") + 0.01,
      "guitar-barre-chords": 7, // clamped to 3
      "guitar-extended-chords": Number.NaN,
      "voice-pitch": 2, // not one of the student's areas
      "nope": 1,
    },
  }, NOW, s.newId));
  const doc = (await s.doc()).data;
  assert.deepEqual(doc.teacherScores, [
    { topic: "guitar-scales", score: 2, at: NOW.toISOString(), day: TODAY },
    { topic: "guitar-barre-chords", score: 3, at: NOW.toISOString(), day: TODAY },
  ]);
  assert.ok(levelsOf(week(doc, r.planId)!).has("intermediate"));
  // sent again at the values they now have: nothing more is recorded
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, scores: { "guitar-scales": 2, "guitar-barre-chords": 3 } }, NOW, s.newId));
  assert.equal((await s.doc()).data.teacherScores.length, 2);
  const after = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(after.topics.find((x) => x.topic === "guitar-scales")!.now, 2);
});

test("the comment lands on the week that was current, never on the new one; trimmed and capped; empty changes nothing", async () => {
  const s = await setup();
  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false, comment: "ignored: no week yet" }, new Date("2026-11-16T12:00:00Z"), s.newId));
  assert.equal(week((await s.doc()).data, first.planId)!.teacher?.comment, undefined);
  const next = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false, comment: "  Her hands hurt after barre chords.  " }, NOW, s.newId));
  let doc = (await s.doc()).data;
  assert.equal(week(doc, first.planId)!.teacher?.comment, "Her hands hurt after barre chords.");
  assert.equal(week(doc, next.planId)!.teacher?.comment, undefined);
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, comment: "   " }, NOW, s.newId));
  doc = (await s.doc()).data;
  assert.equal(week(doc, first.planId)!.teacher?.comment, "Her hands hurt after barre chords.", "an empty comment changes nothing");
  // rotate: the comment goes on the week being replaced, now in history
  const rot = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, comment: "x".repeat(2500) }, NOW, s.newId));
  doc = (await s.doc()).data;
  const replaced = doc.history.find((p) => p.startedOn === "2026-11-16" && p.teacher)!;
  assert.equal(replaced.teacher?.comment?.length, 2000);
  assert.equal(week(doc, rot.planId)!.teacher?.comment, undefined);
});

test("another teacher, or an unknown student: not-found, nothing read or written", async () => {
  const s = await setup();
  const before = await s.doc();
  assert.deepEqual(await makeWeek(s.d, s.other, s.studentId, { today: TODAY, rotate: false, scores: { "guitar-scales": 3 }, comment: "Hi" }, NOW, s.newId), { ok: false, error: "not-found" });
  assert.deepEqual(await makeWeek(s.d, s.teacher, "nobody", { today: TODAY, rotate: false }, NOW, s.newId), { ok: false, error: "not-found" });
  assert.deepEqual(await s.doc(), before);
  assert.equal(s.library.calls.length, 0);
  assert.deepEqual(await studentView(s.d, s.other, s.studentId, TODAY), { ok: false, error: "not-found" });
});

test("no blocks: nothing is written, not the scores and not the comment", async () => {
  const s = await setup({ blocks: [] });
  ok(await makeWeek({ ...s.d, library: stubLibrary(topicBlocks("guitar-scales")) }, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const before = await s.doc();
  const r = await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, scores: { "guitar-scales": 3 }, comment: "Hi" }, NOW, s.newId);
  assert.deepEqual(r, { ok: false, error: "no-blocks" });
  assert.deepEqual(await s.doc(), before);
});

test("no answers: no-answers, nothing written", async () => {
  const s = await setup();
  await s.put({ ...(await s.doc()).data, answers: null });
  const before = await s.doc();
  assert.deepEqual(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false, scores: { "guitar-scales": 3 } }, NOW, s.newId), { ok: false, error: "no-answers" });
  assert.deepEqual(await s.doc(), before);
});

/** A user-data repo that, on the first `times` plan writes with a version, first saves the student's own change (a rating), so the write is stale. */
function racing(inner: UserDataRepo, change: (s: PlanState) => PlanState, times: number): UserDataRepo {
  let left = times;
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop !== "putDoc") return Reflect.get(target, prop, receiver);
      return async (userId: string, kind: "plan", data: unknown, now: Date, expect?: number) => {
        if (left > 0 && expect !== undefined) {
          left--;
          const stored = (await readDocVersioned(target, userId, kind)).data as PlanState;
          await target.putDoc(userId, kind, change(stored), now);
        }
        return target.putDoc(userId, kind, data, now, expect);
      };
    },
  });
}

test("a document changed between read and write is read again; the student's change survives", async () => {
  const base = await setup();
  const first = ok(await makeWeek(base.d, base.teacher, base.studentId, { today: TODAY, rotate: false }, NOW, base.newId));
  const rate = (s: PlanState) => updateGiven(s, first.planId, (p) => ratePlan(p, 0, 0, 5, "2026-11-18T13:00:00Z"));
  const d = { ...base.d, userData: racing(base.base, rate, 1) };
  const next = ok(await makeWeek(d, base.teacher, base.studentId, { today: TODAY, rotate: false, comment: "Good week." }, NOW, base.newId));
  const doc = (await base.doc()).data;
  assert.equal(week(doc, first.planId)!.rated?.["0:0"]?.stars, 5, "the student's rating survives");
  assert.equal(week(doc, first.planId)!.teacher?.comment, "Good week.");
  assert.equal(doc.given[0].id, next.planId);
  assert.equal(doc.given.length, 2);
});

test("still changed after three tries: busy, and the teacher's week is not written", async () => {
  const base = await setup();
  const touch = (s: PlanState) => ({ ...s, practiceDays: s.practiceDays?.length === 1 ? [0, 1] : [0] });
  const d = { ...base.d, userData: racing(base.base, touch, 3) };
  assert.deepEqual(await makeWeek(d, base.teacher, base.studentId, { today: TODAY, rotate: false }, NOW, base.newId), { ok: false, error: "busy" });
  assert.deepEqual((await base.doc()).data.given, []);
  // two changes in a row: the third try lands
  const again = await setup();
  const d2 = { ...again.d, userData: racing(again.base, touch, 2) };
  ok(await makeWeek(d2, again.teacher, again.studentId, { today: TODAY, rotate: false }, NOW, again.newId));
});

test("studentView: the student, the current week with the teacher's comment, and a slider per topic of their areas", async () => {
  const s = await setup();
  const empty = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(empty.student.id, s.studentId);
  assert.equal(empty.student.name, "Ben");
  assert.equal(empty.student.email, "ben@home.com");
  assert.equal(empty.student.claimedAt, null);
  assert.equal(empty.plan, null);
  assert.deepEqual(empty.topics.map((t) => t.topic), ["guitar-scales", "guitar-basic-chords", "guitar-barre-chords", "guitar-extended-chords", "guitar-caged", "guitar-techniques"]);
  assert.ok(empty.topics.every((t) => t.area === "guitar" && t.atStart === null && typeof t.now === "number" && t.label));
  assert.equal(empty.topics[0].label, "Scales");
  assert.equal(empty.topics[0].now, 1, "the answer's rung");
  assert.equal(empty.topics[1].now, 0, "an unanswered topic is 0, never null");

  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, scores: { "guitar-scales": 2.5 }, comment: "Keep at it." }, NOW, s.newId));
  const v = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(v.plan?.startedOn, "2026-11-16");
  assert.notEqual(v.plan?.id, first.planId);
  const scales = v.topics.find((t) => t.topic === "guitar-scales")!;
  assert.equal(scales.now, 2.5);
  assert.equal(scales.atStart, 1, "the score the day before the week started");
  // the teacher reads their own comment back (on the replaced week, now in history)
  const doc = (await s.doc()).data;
  assert.equal(doc.history.find((p) => p.id === first.planId)?.teacher?.comment, "Keep at it.");
  // a week the teacher made later, with a comment on the running one: the running one is the plan shown
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false, comment: "Next up." }, NOW, s.newId));
  const w = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(w.plan?.startedOn, "2026-11-16");
  assert.equal(w.plan?.teacher?.comment, "Next up.");
  assert.equal(ok(await studentView(s.d, s.teacher, s.studentId, addDays(TODAY, 6))).plan?.startedOn, "2026-11-23");
});

test("a block id from the library is computed again when the week is stored", async () => {
  const forged = [...topicBlocks("guitar-scales"), stubBlock("notes-on-neck:1", 9, { id: "forged" })];
  const s = await setup({ blocks: forged });
  const r = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const p = week((await s.doc()).data, r.planId)!;
  const ids = new Set(forged.slice(0, -1).map((b) => b.id));
  assert.ok(p.config.days.every((d) => d.exercises.every((e) => e.blockId && e.blockId !== "forged" && (ids.has(e.blockId) || e.title === "notes-on-neck:1 #9"))));
});

// --- fix round 1

test("rotate paces from today: a slider moved now counts for a week that started two days ago", async () => {
  const s = await setup();
  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  assert.ok(!levelsOf(week((await s.doc()).data, first.planId)!).has("intermediate"));
  const rot = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, scores: { "guitar-scales": 2 } }, NOW, s.newId));
  assert.equal(rot.start, "2026-11-16");
  assert.ok(levelsOf(week((await s.doc()).data, rot.planId)!).has("intermediate"));
});

test("next pressed twice: one upcoming week on the same start, the running week untouched; an untouched upcoming week is dropped", async () => {
  const s = await setup();
  const run = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  const runBefore = week((await s.doc()).data, run.planId);
  const a = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const b = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false, comment: "Watch the thumb." }, new Date("2026-11-18T12:05:00Z"), s.newId));
  assert.equal(a.start, "2026-11-23");
  assert.equal(b.start, "2026-11-23");
  assert.equal(b.comment, "stored");
  const doc = (await s.doc()).data;
  assert.deepEqual(doc.given.map((p) => p.id), [b.planId, run.planId]);
  assert.ok(!doc.history.some((p) => p.id === a.planId), "never touched: dropped");
  assert.deepEqual({ ...week(doc, run.planId)!, teacher: undefined }, { ...runBefore!, teacher: undefined }, "the running week is untouched");
  assert.equal(week(doc, run.planId)!.teacher?.comment, "Watch the thumb.", "the comment goes on the running week, never the upcoming one");
  assert.equal(week(doc, b.planId)!.teacher?.comment, undefined);
  const v = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(v.plan?.id, run.planId);
  // an upcoming week the student already rated goes to history when it is made again
  await s.put(updateGiven(doc, b.planId, (p) => ratePlan(p, 0, 0, 4, "2026-11-18T13:00:00Z")));
  const c = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, new Date("2026-11-18T14:00:00Z"), s.newId));
  const after = (await s.doc()).data;
  assert.deepEqual(after.given.map((p) => p.id), [c.planId, run.planId]);
  assert.equal(after.history[0].id, b.planId);
  assert.equal(after.history[0].rated?.["0:0"]?.stars, 4);
});

test("next after a running week: the new week's first day repeats no block of the running week's last day", async () => {
  const s = await setup();
  const run = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  const next = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const doc = (await s.doc()).data;
  const last = new Set(week(doc, run.planId)!.config.days[6].exercises.map((e) => e.blockId));
  assert.ok(last.size > 0);
  for (const e of week(doc, next.planId)!.config.days[0].exercises) assert.ok(!last.has(e.blockId), e.title);
});

test("comment in the answer: none when none was sent, no-week when there was no week to put it on", async () => {
  const s = await setup();
  assert.equal(ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false, comment: "Early days." }, NOW, s.newId)).comment, "no-week");
  assert.equal(ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true }, NOW, s.newId)).comment, "none");
  assert.equal(ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, comment: "  " }, NOW, s.newId)).comment, "none");
});

/** A stored plan of `n` exercises of 700 characters of text each (the most a text cell keeps). */
const bulky = (id: string, n: number): StoredPlan =>
  ({ id, startedOn: "2026-01-01", done: {}, config: { title: id, days: [{ theme: "", exercises: Array.from({ length: n }, (_, i) => ({ id: `${id}e${i}`, title: `Ex ${i}`, minutes: 5, cells: [{ type: "text", id: "c", text: "x".repeat(700) }] })) }] } as unknown as PlanConfig });
const size = (s: PlanState) => JSON.stringify(sanitiseState(s)).length;
/** How many such exercises fill `bytes` of a stored document. */
const perExercise = (base: PlanState) => size({ ...base, history: [bulky("m", 2)] }) - size({ ...base, history: [bulky("m", 1)] });

test("a document near its cap is fitted (the oldest plans go) instead of refused; one that can't fit is too-big, nothing written", async () => {
  const s = await setup();
  const base = (await s.doc()).data;
  // 20 earlier plans, the oldest one topped up, to within 2000 characters of the cap
  const nearWith = (each: number, extra = 0): PlanState => ({ ...base, history: Array.from({ length: 20 }, (_, i) => bulky(`h${i}`, each + (i === 19 ? extra : 0))) });
  let each = Math.floor(MAX_PLAN_BYTES / perExercise(base) / 20);
  while (size(nearWith(each)) > MAX_PLAN_BYTES - 2000) each--;
  let extra = 0;
  while (size(nearWith(each, extra + 1)) <= MAX_PLAN_BYTES - 2000) extra++;
  const near = nearWith(each, extra);
  assert.ok(size(near) <= MAX_PLAN_BYTES && size(near) > MAX_PLAN_BYTES - 3000, String(size(near)));
  await s.put(near);
  assert.equal((await s.doc()).data.history.length, 20);
  const r = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const doc = (await s.doc()).data;
  assert.equal(doc.given[0].id, r.planId);
  assert.ok(doc.history.length < 20, "the oldest plans made room");
  assert.equal(doc.history[0].id, "h0", "the newest earlier plans stay");

  const full = await setup();
  const fb = (await full.doc()).data;
  // the running plan is never dropped: a current plan this big can't fit with a week beside it
  let n = Math.floor(MAX_PLAN_BYTES / perExercise(fb));
  while (size({ ...fb, current: bulky("big", n) }) > MAX_PLAN_BYTES - 1500) n--;
  await full.base.putDoc(full.studentId, "plan", { ...fb, current: bulky("big", n) }, NOW);
  const before = await full.doc();
  assert.ok(before.data.current, "the big plan is stored");
  assert.deepEqual(await makeWeek(full.d, full.teacher, full.studentId, { today: TODAY, rotate: false }, NOW, full.newId), { ok: false, error: "too-big" });
  assert.deepEqual(await full.doc(), before);
});

// --- final fix wave

test("a slider moved in the teacher's evening west of UTC counts on the teacher's day: the rotated week and the view use it", async () => {
  const s = await setup();
  const evening = new Date("2026-11-19T01:00:00.000Z"); // 20:00 on 18 Nov in New York
  const first = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  assert.ok(!levelsOf(week((await s.doc()).data, first.planId)!).has("intermediate"));
  const rot = ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: true, scores: { "guitar-scales": 2 } }, evening, s.newId));
  const doc = (await s.doc()).data;
  assert.deepEqual(doc.teacherScores, [{ topic: "guitar-scales", score: 2, at: evening.toISOString(), day: TODAY }]);
  assert.ok(levelsOf(week(doc, rot.planId)!).has("intermediate"), "the week is composed at the new level");
  const v = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.equal(v.topics.find((t) => t.topic === "guitar-scales")!.now, 2, "the slider opens at the new score");
});

test("studentView: the upcoming week's start when the teacher made one, else null", async () => {
  const s = await setup();
  assert.equal(ok(await studentView(s.d, s.teacher, s.studentId, TODAY)).upcoming, null);
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: "2026-11-16", rotate: false }, new Date("2026-11-16T12:00:00Z"), s.newId));
  assert.equal(ok(await studentView(s.d, s.teacher, s.studentId, TODAY)).upcoming, null, "the running week is not upcoming");
  ok(await makeWeek(s.d, s.teacher, s.studentId, { today: TODAY, rotate: false }, NOW, s.newId));
  const v = ok(await studentView(s.d, s.teacher, s.studentId, TODAY));
  assert.deepEqual(v.upcoming, { start: "2026-11-23" });
  assert.equal(v.plan?.startedOn, "2026-11-16", "the running week is still the plan shown");
});

test("practice days: the week has exercises on those weekdays only, the days are kept for the next week, and all seven clears them", async () => {
  const t = await setup();
  // 2026-11-18 is a Wednesday: Monday, Wednesday and Friday are days 0, 2 and 5 of a week starting then
  const made = ok(await makeWeek(t.d, t.teacher, t.studentId, { today: TODAY, rotate: true, days: [4, 0, 2, 2] }, NOW, t.newId));
  let s = (await t.doc()).data;
  assert.deepEqual(s.practiceDays, [0, 2, 4]);
  const held = week(s, made.planId)!.config.days.map((d) => d.exercises.length > 0);
  assert.deepEqual(held, [true, false, true, false, false, true, false]);
  assert.equal(made.short, false, "a rest day is not a short day");
  assert.deepEqual(ok(await studentView(t.d, t.teacher, t.studentId, TODAY)).practiceDays, [0, 2, 4]);

  // the next week, with no days sent, keeps them: it starts on a Wednesday again
  const next = ok(await makeWeek(t.d, t.teacher, t.studentId, { today: TODAY, rotate: false }, NOW, t.newId));
  s = (await t.doc()).data;
  assert.deepEqual(week(s, next.planId)!.config.days.map((d) => d.exercises.length > 0), [true, false, true, false, false, true, false]);

  ok(await makeWeek(t.d, t.teacher, t.studentId, { today: TODAY, rotate: true, days: [0, 1, 2, 3, 4, 5, 6] }, NOW, t.newId));
  s = (await t.doc()).data;
  assert.equal(s.practiceDays, undefined);
  assert.deepEqual(ok(await studentView(t.d, t.teacher, t.studentId, TODAY)).practiceDays, [0, 1, 2, 3, 4, 5, 6]);
});
