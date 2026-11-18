import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateAnswers } from "@/features/plan/intake/answers";
import { afterAdd, type AddDraft } from "./addFlow";

const draft: AddDraft = { name: "Ann Lee", email: "ann@school.com", answers: { ...migrateAnswers(null), areas: ["guitar", "voice"], topics: { "guitar-chords": 2 }, notes: "a gig in May" } };
const copy = structuredClone(draft);
const LAST = 6;
const fail = (code: string, error = `line for ${code}`) => ({ ok: false as const, code, error });

test("exists: back to the first screen, the line under the email field, the draft as typed", () => {
  const r = afterAdd(fail("exists", "Someone already has an account with that email address."), draft, LAST);
  assert.equal(r.step, 0);
  assert.deepEqual(r.error, { field: "email", text: "Someone already has an account with that email address." });
  assert.equal(r.draft, draft);
  assert.deepEqual(r.draft, copy, "nothing typed or picked is lost");
  assert.equal(r.added, undefined);
});

test("name and email errors go back to the first screen, under their own field", () => {
  assert.deepEqual(afterAdd(fail("name"), draft, LAST), { step: 0, draft, error: { field: "name", text: "line for name" } });
  assert.deepEqual(afterAdd(fail("email"), draft, LAST), { step: 0, draft, error: { field: "email", text: "line for email" } });
});

test("limit, offline, failed and the rest stay on the last screen with their line", () => {
  for (const code of ["limit", "offline", "failed", "answers", "bad-date", "logged-out", "account-changed"]) {
    const r = afterAdd(fail(code), draft, LAST);
    assert.equal(r.step, LAST, code);
    assert.deepEqual(r.error, { text: `line for ${code}` }, code);
    assert.deepEqual(r.draft, copy, code);
    assert.equal(r.added, undefined, code);
  }
});

test("added: the student, what happened to the plan and the email, no error", () => {
  const student = { id: "a1", name: "Ann Lee", email: "ann@school.com", addedAt: "2026-11-18T10:00:00.000Z", claimedAt: null };
  const r = afterAdd({ ok: true, student, plan: "short", mail: "failed" }, draft, LAST);
  assert.deepEqual(r.added, { student, plan: "short", mail: "failed" });
  assert.equal(r.error, null);
});
