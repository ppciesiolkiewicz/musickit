import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelRun, endRun, listRunning, startRun } from "./running";

test("a started run is listed until it ends", () => {
  const signal = startRun({ id: "2026-11-01T10-00-00-aaaa", at: "2026-11-01T10:00:00.000Z", model: "haiku" });
  assert.equal(signal.aborted, false);
  assert.deepEqual(listRunning(), [{ id: "2026-11-01T10-00-00-aaaa", at: "2026-11-01T10:00:00.000Z", model: "haiku" }]);
  endRun("2026-11-01T10-00-00-aaaa");
  assert.deepEqual(listRunning(), []);
});

test("cancelRun aborts that run only, and says whether there was one", () => {
  const a = startRun({ id: "2026-11-01T10-00-00-aaaa", at: "x", model: "haiku" });
  const b = startRun({ id: "2026-11-01T10-00-00-bbbb", at: "x", model: "opus" });
  assert.equal(cancelRun("2026-11-01T10-00-00-aaaa"), true);
  assert.deepEqual([a.aborted, b.aborted], [true, false]);
  assert.equal(cancelRun("nope"), false);
  endRun("2026-11-01T10-00-00-aaaa");
  endRun("2026-11-01T10-00-00-bbbb");
});

test("the registry survives the module being loaded again (dev reloads)", async () => {
  startRun({ id: "2026-11-01T10-00-00-cccc", at: "x", model: "haiku" });
  const again = await import(`./running.ts?reload=${Date.now()}`);
  assert.equal(again.listRunning().length, 1);
  endRun("2026-11-01T10-00-00-cccc");
});
