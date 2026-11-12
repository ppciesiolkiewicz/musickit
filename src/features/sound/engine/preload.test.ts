import { test } from "node:test";
import assert from "node:assert/strict";
import { whenIdleAfterLoad } from "./preload";

function fakeWindow(readyState: string, idle: boolean) {
  const calls: string[] = [];
  let onLoad: (() => void) | null = null;
  const win = {
    document: { readyState },
    addEventListener: (type: string, fn: () => void) => {
      calls.push(`listen:${type}`);
      onLoad = fn;
    },
    requestIdleCallback: idle ? (fn: () => void, opts?: { timeout?: number }) => (calls.push(`idle:${opts?.timeout}`), fn(), 1) : undefined,
    setTimeout: (fn: () => void, ms: number) => (calls.push(`timeout:${ms}`), fn(), 1),
  };
  return { win, calls, fireLoad: () => onLoad?.() };
}

test("before the page has loaded, nothing runs until load, then it waits for idle time", () => {
  const { win, calls, fireLoad } = fakeWindow("interactive", true);
  let ran = 0;
  whenIdleAfterLoad(win as never, () => ran++);
  assert.equal(ran, 0);
  assert.deepEqual(calls, ["listen:load"]);
  fireLoad();
  assert.equal(ran, 1);
  assert.deepEqual(calls, ["listen:load", "idle:2000"]);
});

test("already loaded and no idle callback: it runs after a short delay", () => {
  const { win, calls } = fakeWindow("complete", false);
  let ran = 0;
  whenIdleAfterLoad(win as never, () => ran++);
  assert.equal(ran, 1);
  assert.deepEqual(calls, ["timeout:1500"]);
});
