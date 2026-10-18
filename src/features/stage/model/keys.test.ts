import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS, shortcutFor, type Shortcut } from "./keys";

const ev = (code: string, mods: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({ code, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...mods });
const free = { typing: false, hasSelection: false };
const sel = { typing: false, hasSelection: true };

test("nothing fires while typing in a field", () => {
  assert.equal(shortcutFor(ev("KeyC"), { typing: true, hasSelection: false }), null);
  assert.equal(shortcutFor(ev("Backspace"), { typing: true, hasSelection: true }), null);
  assert.equal(shortcutFor(ev("ArrowLeft"), { typing: true, hasSelection: true }), null);
  assert.equal(shortcutFor(ev("Slash"), { typing: true, hasSelection: false }), null);
});

test("delete and nudges need a selection", () => {
  assert.equal(shortcutFor(ev("Backspace"), free), null);
  assert.equal(shortcutFor(ev("Delete"), sel), "delete");
  assert.equal(shortcutFor(ev("ArrowUp"), free), null);
  assert.equal(shortcutFor(ev("ArrowUp"), sel), "nudge-up");
});

test("palette opens with / and with Cmd or Ctrl+K", () => {
  assert.equal(shortcutFor(ev("Slash"), free), "palette");
  assert.equal(shortcutFor(ev("KeyK", { metaKey: true }), free), "palette");
  assert.equal(shortcutFor(ev("KeyK", { ctrlKey: true }), free), "palette");
  assert.equal(shortcutFor(ev("KeyK"), free), null);
});

test("? is help, not the palette", () => {
  assert.equal(shortcutFor(ev("Slash", { shiftKey: true }), free), "help");
});

test("Alt+arrows resize: right and down grow, left and up shrink", () => {
  assert.equal(shortcutFor(ev("ArrowLeft", { altKey: true }), sel), "shrink-w");
  assert.equal(shortcutFor(ev("ArrowRight", { altKey: true }), sel), "grow-w");
  assert.equal(shortcutFor(ev("ArrowUp", { altKey: true }), sel), "shrink-h");
  assert.equal(shortcutFor(ev("ArrowDown", { altKey: true }), sel), "grow-h");
});

test("C and F are the camera presets, but not with Cmd (copy, find)", () => {
  assert.equal(shortcutFor(ev("KeyC"), free), "camera-corner");
  assert.equal(shortcutFor(ev("KeyF"), free), "camera-full");
  assert.equal(shortcutFor(ev("KeyC", { metaKey: true }), free), null);
  assert.equal(shortcutFor(ev("KeyF", { ctrlKey: true }), free), null);
});

test("Escape deselects", () => {
  assert.equal(shortcutFor(ev("Escape"), sel), "deselect");
});

test("every shortcut is listed exactly once in KEYS", () => {
  const all: Shortcut[] = ["palette", "delete", "nudge-left", "nudge-right", "nudge-up", "nudge-down", "grow-w", "shrink-w", "grow-h", "shrink-h", "deselect", "camera-corner", "camera-full", "help"];
  for (const s of all) assert.equal(KEYS.filter((k) => k.shortcut === s).length, 1, s);
  assert.equal(KEYS.length, all.length);
});
