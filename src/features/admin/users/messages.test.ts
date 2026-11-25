import { test } from "node:test";
import assert from "node:assert/strict";
import { failedMessage, SELF, thrownMessage } from "./messages";

test("the error fits a failed untick", () => {
  assert.doesNotMatch(failedMessage(undefined), /tick/i);
});

test("the own-admin refusal is named", () => {
  assert.equal(failedMessage("self"), SELF);
});

test("a thrown browser error shows as the plain failure", () => {
  assert.equal(thrownMessage(new TypeError("Failed to fetch")), failedMessage(undefined));
  assert.equal(thrownMessage(new Error("The operation timed out.")), failedMessage(undefined));
  assert.equal(thrownMessage("oops"), failedMessage(undefined));
  assert.equal(thrownMessage(new Error(SELF)), SELF);
});
