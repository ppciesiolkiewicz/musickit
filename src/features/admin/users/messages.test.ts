import { test } from "node:test";
import assert from "node:assert/strict";
import { failedMessage, SELF } from "./messages";

test("the error fits a failed untick", () => {
  assert.doesNotMatch(failedMessage(undefined), /tick/i);
});

test("the own-admin refusal is named", () => {
  assert.equal(failedMessage("self"), SELF);
});
