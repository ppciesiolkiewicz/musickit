import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnder, placeFor } from "./appPlaces";

test("placeFor finds the place of a path, ignoring its query and hash", () => {
  assert.equal(placeFor("/plan")?.label, "Practice plan");
  assert.equal(placeFor("/teachers/studio?notes=1#n=abc")?.label, "Interactive notes");
  assert.equal(placeFor("/note/abc")?.label, "Interactive notes");
  assert.equal(placeFor("/theory/scales?key=G")?.label, "Practice");
});

test("placeFor is null outside the three places", () => {
  assert.equal(placeFor("/"), null);
  assert.equal(placeFor("/account"), null);
  assert.equal(placeFor("/planets"), null);
});

test("isUnder takes the path itself and anything below it, not a longer name", () => {
  assert.equal(isUnder("/note", ["/note"]), true);
  assert.equal(isUnder("/note/x", ["/note"]), true);
  assert.equal(isUnder("/notes", ["/note"]), false);
});
