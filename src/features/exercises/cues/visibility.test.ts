import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { noteState, othersOf } from "./visibility";

describe("visibility", () => {
  it("everything is normal when nothing is listed", () => {
    assert.equal(noteState({}, 4), "normal");
  });

  it("a highlight lights its notes and mutes the rest", () => {
    assert.equal(noteState({ highlight: [1] }, 1), "highlighted");
    assert.equal(noteState({ highlight: [1] }, 0), "muted");
    assert.equal(noteState({ highlight: [1], others: "hidden" }, 0), "hidden");
  });

  it("added notes are lit but never mute the rest", () => {
    assert.equal(noteState({ add: [1] }, 1), "highlighted");
    assert.equal(noteState({ add: [1] }, 0), "normal");
  });

  it("hide beats mute beats highlight", () => {
    assert.equal(noteState({ highlight: [1], hide: [1] }, 1), "hidden");
    assert.equal(noteState({ highlight: [1], mute: [1] }, 1), "muted");
  });

  it("a highlight no drawn note matches lights nothing and does not throw", () => {
    assert.equal(noteState({ highlight: [3] }, 9), "muted");
  });

  it("reads others, the old dimmed as muted", () => {
    assert.equal(othersOf("dimmed"), "muted");
    assert.equal(othersOf("hidden"), "hidden");
    assert.equal(othersOf("normal"), "normal");
    assert.equal(othersOf("x"), undefined);
  });
});
