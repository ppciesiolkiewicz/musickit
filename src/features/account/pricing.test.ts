import { test } from "node:test";
import assert from "node:assert/strict";
import { EARLY_OFFER, earlyOpen } from "./pricing";

test("the early price stays open on a side until its places are all taken", () => {
  assert.deepEqual(earlyOpen({ schools: 0, students: 0 }), { individual: true, teachers: true });
  assert.deepEqual(earlyOpen({ schools: EARLY_OFFER.schools - 1, students: EARLY_OFFER.students }), { individual: false, teachers: true });
  assert.deepEqual(earlyOpen({ schools: EARLY_OFFER.schools, students: 3 }), { individual: true, teachers: false });
});
