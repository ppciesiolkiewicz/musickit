import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createChannelPicker, rms } from "./mic";

describe("rms", () => {
  it("is the level of a frame", () => {
    assert.equal(rms([]), 0);
    assert.equal(rms([0.5, -0.5, 0.5, -0.5]), 0.5);
  });
});

describe("channel picker", () => {
  const feed = (p: ReturnType<typeof createChannelPicker>, levels: number[], n: number) => {
    let c = -1;
    for (let i = 0; i < n; i++) c = p.pick(levels);
    return c;
  };

  it("starts on Input 1", () => {
    assert.equal(createChannelPicker().pick([0, 0]), 0);
  });

  it("moves to an input that stays clearly louder", () => {
    const p = createChannelPicker(3);
    assert.equal(feed(p, [0.01, 0.1], 2), 0);
    assert.equal(p.pick([0.01, 0.1]), 1);
  });

  it("ignores a short burst on the other input", () => {
    const p = createChannelPicker(3);
    feed(p, [0.01, 0.1], 2);
    p.pick([0.1, 0.01]);
    assert.equal(feed(p, [0.01, 0.1], 2), 0);
  });

  it("stays put when the other is only a little louder, or both are silent", () => {
    const p = createChannelPicker(2);
    feed(p, [0, 0.1], 2);
    assert.equal(feed(p, [0.08, 0.1], 10), 1);
    assert.equal(feed(p, [0.001, 0], 10), 1);
  });

  it("keeps one input on a mono device", () => {
    assert.equal(feed(createChannelPicker(1), [0.2], 5), 0);
  });
});
