import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { layersOf, noteState, othersOf } from "./visibility";

describe("visibility", () => {
  it("everything is normal when nothing is listed", () => {
    assert.equal(noteState({}, 4), "normal");
  });

  it("a highlight rings its notes and leaves the rest in play", () => {
    assert.equal(noteState({ highlight: [1] }, 1), "highlighted");
    assert.equal(noteState({ highlight: [1] }, 0), "normal");
  });

  it("enable puts only its notes in play: the rest take others, muted by default", () => {
    assert.equal(noteState({ enable: [0, 4] }, 4), "normal");
    assert.equal(noteState({ enable: [0, 4] }, 7), "muted");
    assert.equal(noteState({ enable: [0, 4], others: "hidden" }, 7), "hidden");
  });

  it("the layers combine: enabled notes in full, the highlighted ones among them ringed", () => {
    const v = { enable: [0, 4, 7], highlight: [4] };
    assert.deepEqual([0, 4, 7, 9].map((pc) => noteState(v, pc)), ["normal", "highlighted", "normal", "muted"]);
  });

  it("an old highlight that muted the rest reads as the enabled set", () => {
    assert.deepEqual(layersOf({ highlight: ["1"], others: "muted" }), { enable: ["1"], highlight: undefined });
    assert.deepEqual(layersOf({ highlight: ["1"], others: "hidden" }), { enable: ["1"], highlight: undefined });
    assert.deepEqual(layersOf({ highlight: ["1"], others: "normal" }), { enable: undefined, highlight: ["1"] });
    assert.deepEqual(layersOf({ highlight: ["1"] }), { enable: undefined, highlight: ["1"] });
    assert.deepEqual(layersOf({ enable: ["1", "5"], highlight: ["1"], others: "muted" }), { enable: ["1", "5"], highlight: ["1"] });
  });

  it("added notes are lit but never mute the rest", () => {
    assert.equal(noteState({ add: [1] }, 1), "highlighted");
    assert.equal(noteState({ add: [1] }, 0), "normal");
  });

  it("hide beats mute beats highlight", () => {
    assert.equal(noteState({ highlight: [1], hide: [1] }, 1), "hidden");
    assert.equal(noteState({ highlight: [1], mute: [1] }, 1), "muted");
    assert.equal(noteState({ enable: [1], mute: [1] }, 1), "muted");
  });

  it("a highlight no drawn note matches lights nothing and does not throw", () => {
    assert.equal(noteState({ highlight: [3] }, 9), "normal");
  });

  it("reads others, the old dimmed as muted", () => {
    assert.equal(othersOf("dimmed"), "muted");
    assert.equal(othersOf("hidden"), "hidden");
    assert.equal(othersOf("normal"), "normal");
    assert.equal(othersOf("x"), undefined);
  });
});
