import { test } from "node:test";
import assert from "node:assert/strict";
import { takeAudioFocus } from "./focus";

test("a source taking the focus stops the one that held it", () => {
  const stopped: string[] = [];
  takeAudioFocus(() => stopped.push("drone"));
  takeAudioFocus(() => stopped.push("play-along"));
  assert.deepEqual(stopped, ["drone"]);
});

test("a released source is not stopped again, and a stale release keeps the new holder", () => {
  const stopped: string[] = [];
  const releaseA = takeAudioFocus(() => stopped.push("a"));
  releaseA();
  takeAudioFocus(() => stopped.push("b"));
  assert.equal(stopped.length, 0);
  releaseA();
  takeAudioFocus(() => stopped.push("c"));
  assert.deepEqual(stopped, ["b"]);
});

test("a holder whose stop releases itself leaves the new one holding", () => {
  const stopped: string[] = [];
  const release = takeAudioFocus(() => { stopped.push("a"); release(); });
  takeAudioFocus(() => stopped.push("b"));
  takeAudioFocus(() => stopped.push("c"));
  assert.deepEqual(stopped, ["a", "b"]);
});

test("sources in one group play together; a source outside it stops them all", () => {
  const stopped: string[] = [];
  takeAudioFocus(() => stopped.push("alone"));
  takeAudioFocus(() => stopped.push("drone"), "step");
  takeAudioFocus(() => stopped.push("chords"), "step");
  assert.deepEqual(stopped, ["alone"]);
  takeAudioFocus(() => stopped.push("other"), "other step");
  assert.deepEqual(stopped, ["alone", "drone", "chords"]);
  takeAudioFocus(() => stopped.push("play-along"));
  assert.deepEqual(stopped, ["alone", "drone", "chords", "other"]);
});
