import { test } from "node:test";
import assert from "node:assert/strict";
import { errorText, GENERIC_ERROR, isAbort, isNoise, ShownError } from "./errors";

test("the words are the most specific there are: the error's own, the caller's, then the generic line", () => {
  assert.equal(errorText(new ShownError("This account is already gone. Reload the page."), "Couldn't delete the account. Try again."), "This account is already gone. Reload the page.");
  assert.equal(errorText(new TypeError("Failed to fetch"), "Couldn't delete the account. Try again."), "Couldn't delete the account. Try again.");
  assert.equal(errorText(new Error("internal detail")), GENERIC_ERROR);
  assert.equal(errorText("a string"), GENERIC_ERROR);
});

test("an abort is not a failure; a timeout is", () => {
  assert.equal(isAbort(new DOMException("x", "AbortError")), true);
  assert.equal(isAbort(new DOMException("x", "TimeoutError")), false);
});

test("browser noise and other sites' scripts are not reported", () => {
  assert.equal(isNoise("ResizeObserver loop completed with undelivered notifications.", undefined, "http://a.test"), true);
  assert.equal(isNoise("boom", "https://ext.example/x.js", "http://a.test"), true);
  assert.equal(isNoise("boom", "http://a.test/_next/x.js", "http://a.test"), false);
  assert.equal(isNoise("boom", undefined, "http://a.test"), false);
});
