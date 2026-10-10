import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Transport, TRANSPORT_LEAD } from "./transport";

const make = () => {
  const t = new Transport();
  t.setTiming(0.5, 4); // 120 bpm, 4/4: a bar is 2 s
  return t;
};

describe("transport", () => {
  it("starts stopped", () => {
    const t = make();
    assert.equal(t.state, "stopped");
    assert.equal(t.active, false);
    assert.equal(t.going, false);
  });

  it("plays at once without a count-in", () => {
    const t = make();
    const a = t.play(10, 0);
    assert.equal(a, 10 + TRANSPORT_LEAD);
    assert.equal(t.state, "running");
    assert.equal(t.going, true);
  });

  it("counts in whole bars, then runs at the anchor", () => {
    const t = make();
    const a = t.play(10, 1);
    assert.equal(a, 10 + TRANSPORT_LEAD + 2);
    assert.equal(t.state, "countIn");
    assert.equal(t.tick(11), false);
    assert.equal(t.tick(a), true);
    assert.equal(t.state, "running");
  });

  it("play is a no-op while counting in or running", () => {
    const t = make();
    const a = t.play(10, 1);
    assert.equal(t.play(10.5, 1), a);
    t.tick(a);
    assert.equal(t.play(13, 1), a);
    assert.equal(t.state, "running");
  });

  it("stops on the next bar line", () => {
    const t = make();
    const a = t.play(0, 0); // anchor 0.05
    const at = t.stop(1, "bar");
    assert.equal(at, a + 2);
    assert.equal(t.state, "stopping");
    assert.equal(t.going, false);
    assert.equal(t.active, true);
    assert.equal(t.tick(at - 0.01), false);
    assert.equal(t.tick(at), true);
    assert.equal(t.state, "stopped");
    assert.equal(t.stopAt, null);
  });

  it("stops on the next beat line", () => {
    const t = make();
    const a = t.play(0, 0);
    assert.equal(t.stop(1.2, "beat"), a + 1.5);
  });

  it("stop with quantise off stops now", () => {
    const t = make();
    t.play(0, 0);
    assert.equal(t.stop(3, "off"), 3);
    assert.equal(t.state, "stopped");
  });

  it("stop during the count-in stops now", () => {
    const t = make();
    t.play(0, 1);
    assert.equal(t.stop(0.5, "bar"), 0.5);
    assert.equal(t.state, "stopped");
  });

  it("stop is a no-op when stopped or already stopping", () => {
    const t = make();
    assert.equal(t.stop(1, "bar"), 1);
    assert.equal(t.state, "stopped");
    t.play(0, 0);
    const at = t.stop(1, "bar");
    assert.equal(t.stop(1.5, "bar"), at);
  });

  it("play while stopping cancels the stop and keeps the anchor", () => {
    const t = make();
    const a = t.play(0, 0);
    t.stop(1, "bar");
    assert.equal(t.play(1.5, 1), a);
    assert.equal(t.state, "running");
    assert.equal(t.stopAt, null);
  });

  it("finds the next beat and bar line after a margin", () => {
    const t = make();
    const a = t.play(0, 0); // 0.05
    assert.equal(t.next(0.6, "beat"), a + 1);
    assert.equal(t.next(0.53, "beat", 0.03), a + 1);
    assert.equal(t.next(0.6, "bar"), a + 2);
  });

  it("setTiming keeps the anchor", () => {
    const t = make();
    const a = t.play(0, 0);
    t.setTiming(0.4, 3);
    assert.equal(t.anchor, a);
    assert.ok(Math.abs(t.next(0.1, "bar") - (a + 1.2)) < 1e-9);
  });

  it("moveAnchor re-anchors a running grid", () => {
    const t = make();
    t.play(0, 0);
    t.moveAnchor(5);
    assert.equal(t.anchor, 5);
    assert.equal(t.next(5.1, "beat"), 5.5);
  });

  it("stopAtTime stops at a given line, or now when it has passed", () => {
    const t = make();
    t.play(0, 0);
    assert.equal(t.stopAtTime(3, 4.05), 4.05);
    assert.equal(t.state, "stopping");
    const u = make();
    u.play(0, 0);
    assert.equal(u.stopAtTime(5, 4.05), 5);
    assert.equal(u.state, "stopped");
  });

  it("recount puts a future anchor back into the count-in", () => {
    const t = make();
    t.play(0, 0);
    t.recount(5, 3);
    assert.equal(t.anchor, 5);
    assert.equal(t.state, "countIn");
    t.tick(5);
    assert.equal(t.state, "running");
    t.recount(4, 6);
    assert.equal(t.state, "running");
  });

  it("joinAt: after a restart everything starts on beat 1, else on the next beat", () => {
    const t = make();
    const a = t.play(0, 1); // beat 1 is a bar away: armed sequencers must stay silent through the count-in
    assert.equal(t.joinAt(true, 0.5), a);
    assert.equal(t.joinAt(false, 0.5), 0.5);
  });
});
