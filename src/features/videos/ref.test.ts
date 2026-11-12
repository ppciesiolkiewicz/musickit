import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, refTitle, sanitiseVideoRef } from "./ref";

test("a library ref keeps a known id, a recording a plain id and a clean name", () => {
  assert.deepEqual(sanitiseVideoRef({ source: "library", id: "c-major-first-steps", x: 1 }), { source: "library", id: "c-major-first-steps" });
  assert.equal(sanitiseVideoRef({ source: "library", id: "unknown" }), null);
  assert.deepEqual(sanitiseVideoRef({ source: "recording", id: "ab-12", title: "  My   scales \n take " }), { source: "recording", id: "ab-12", title: "My scales take" });
  assert.deepEqual(sanitiseVideoRef({ source: "recording", id: "ab-12" }), { source: "recording", id: "ab-12", title: "My video" });
  assert.equal(sanitiseVideoRef({ source: "recording", id: "../x" }), null);
  assert.deepEqual(sanitiseVideoRef({ source: "placeholder", id: "x", title: "y" }), { source: "placeholder" });
  assert.deepEqual(sanitiseVideoRef({ source: "placeholder", text: "  Your  teacher's \n video " }), { source: "placeholder", text: "Your teacher's video" });
  assert.deepEqual(sanitiseVideoRef({ source: "placeholder", text: "  " }), { source: "placeholder" });
  assert.equal((sanitiseVideoRef({ source: "placeholder", text: "x".repeat(300) }) as { text: string }).text.length, 200);
  assert.equal(sanitiseVideoRef({ source: "url", id: "x" }), null);
  assert.equal(sanitiseVideoRef("c-major-first-steps"), null);
});

test("a name is cut at 80 characters, and a ref has a title", () => {
  assert.equal(cleanTitle("x".repeat(100)).length, 80);
  assert.equal(refTitle({ source: "library", id: "c-major-do-re-mi-long" }), "Do Re Mi Fa Sol");
  assert.equal(refTitle({ source: "recording", id: "a", title: "Warm-up" }), "Warm-up");
  assert.equal(refTitle({ source: "placeholder" }), "Placeholder");
});
