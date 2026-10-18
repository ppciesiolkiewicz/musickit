import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLES, SEEN_KEY, THEME_KEY, courseNote, photoFor, readSaved, resolveStyle, styleAfterIntroDismiss } from "./styles";

test("ids and order", () => assert.deepEqual(STYLES.map((s) => s.id), ["funk", "rock", "blues", "surf", "metal", "jazz", "plain"]));

test("labels and emoji", () => {
  assert.equal(STYLES.find((s) => s.id === "surf")!.label, "Surf Rock");
  assert.deepEqual(STYLES.map((s) => s.emoji), ["🕺", "⚡", "🎷", "🏄", "🤘", "🎺", "🙂"]);
});

test("resolveStyle: valid kept, old/garbage/null → funk", () => {
  assert.equal(resolveStyle("metal"), "metal");
  for (const v of ["dark", "funky", "light", "", "x", null]) assert.equal(resolveStyle(v), "funk");
});

test("readSaved: nothing saved → funk, not chosen, not seen", () => {
  assert.deepEqual(readSaved({ getItem: () => null }), { style: "funk", chosen: false, seen: false });
});

test("readSaved: old value → funk, not chosen", () => {
  assert.deepEqual(readSaved({ getItem: (k) => (k === THEME_KEY ? "dark" : null) }), { style: "funk", chosen: false, seen: false });
});

test("readSaved: storage throws → funk defaults", () => {
  assert.deepEqual(readSaved({ getItem: () => { throw new Error("blocked"); } }), { style: "funk", chosen: false, seen: false });
  assert.deepEqual(readSaved(null), { style: "funk", chosen: false, seen: false });
});

test("readSaved: saved style and seen flag", () => {
  assert.deepEqual(readSaved({ getItem: (k) => (k === SEEN_KEY ? "1" : "jazz") }), { style: "jazz", chosen: true, seen: true });
});

test("intro dismiss goes plain", () => assert.equal(styleAfterIntroDismiss(), "plain"));

test("course notes: soon four only, never 'later'", () => {
  assert.equal(courseNote("funk"), "Funk course: coming soon");
  assert.equal(courseNote("surf"), "Surf Rock course: coming soon");
  assert.equal(courseNote("blues"), "Blues course: coming soon");
  assert.equal(courseNote("rock"), "Rock course: coming soon");
  for (const id of ["metal", "jazz", "plain"] as const) assert.equal(courseNote(id), null);
  assert.ok(STYLES.every((s) => !JSON.stringify(s).toLowerCase().includes("later")));
});

test("photos: every non-plain style overrides practising and couch, plain overrides nothing", () => {
  for (const s of STYLES) {
    if (s.id === "plain") {
      assert.equal(photoFor("practising", "plain"), null);
      assert.equal(photoFor("couch", "plain"), null);
      continue;
    }
    assert.ok(photoFor("practising", s.id)?.id);
    assert.ok(photoFor("couch", s.id)?.id);
    assert.notEqual(photoFor("practising", s.id)!.id, photoFor("couch", s.id)!.id);
    assert.equal(photoFor("teacher", s.id), null);
  }
  assert.equal(photoFor("practising", "metal")!.id, "1515890326200-a07ce46010a1");
  assert.equal(photoFor("couch", "blues")!.id, "1508186736123-44a5fcb36f9f");
});

test("dividers: plain has none, others have the spec text", () => {
  const text = Object.fromEntries(STYLES.map((s) => [s.id, s.divider?.text ?? null]));
  assert.deepEqual(text, { funk: "on the one", rock: "turn it up to 11", blues: "12 bars · I IV V", surf: "drenched in spring reverb", metal: "drop D", jazz: "ii · V · I", plain: null });
});
