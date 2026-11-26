import { test } from "node:test";
import assert from "node:assert/strict";
import type { UserFootprint } from "@/features/account/server/repo";
import { deleteLines } from "./deleteLines";

const empty = (status: string | null = null): UserFootprint =>
  ({
    user: { name: "Kim", email: "kim@school.test", subscriptionStatus: status },
    sessions: 0, identities: 0, tokens: 0, invites: 0, students: 0, teacher: 0, planRequest: 0, documents: [],
    progress: 0, dayTimes: 0, videos: 0, shares: 0, planClaims: 0, threads: 0, messages: 0, voice: 0, reminder: 0, blocks: 0, payments: 0,
  }) as unknown as UserFootprint;

test("an empty account lists only itself", () => {
  assert.deepEqual(deleteLines(empty()), { gone: ["The account: Kim, kim@school.test"], kept: [], warning: null });
});

test("what they have is listed, counted, and what stays is apart", () => {
  const f = { ...empty(), sessions: 2, invites: 1, videos: 1, threads: 1, messages: 3, documents: ["notes", "plan"], students: 2, payments: 1 };
  const { gone, kept } = deleteLines(f);
  assert.ok(gone.includes("2 logged-in browsers, logged out"));
  assert.ok(gone.includes("1 invite they joined with"));
  assert.ok(gone.includes("1 video, with the files"));
  assert.ok(gone.includes("1 message thread with 3 messages"));
  assert.ok(gone.includes("Their data: notes, plan"));
  assert.deepEqual(kept, ["2 students lose their teacher. Their accounts stay.", "1 payment record stays, with no account on it."]);
});

test("a live Stripe subscription warns; a cancelled one doesn't", () => {
  assert.match(deleteLines(empty("past_due")).warning ?? "", /past due\. Deleting the account doesn't cancel it/);
  assert.equal(deleteLines(empty("canceled")).warning, null);
});
