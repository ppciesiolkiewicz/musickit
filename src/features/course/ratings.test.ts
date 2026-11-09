import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SECTIONS } from "./course";
import { noteKey } from "./notes";
import { courseRatings } from "./ratings";

const [a, b, c] = ALL_SECTIONS;
const key = (r: typeof a) => noteKey(r.stage.slug, r.section.slug);
const title = (r: typeof a) => `${r.stage.title} › ${r.section.title}`;

test("a rated real section gives its title, stars and note", () => {
  assert.deepEqual(courseRatings({ [key(a)]: { stars: 2, note: " slow chords " } }), [{ title: title(a), stars: 2, note: "slow chords" }]);
});

test("unknown sections and unrated notes are skipped", () => {
  assert.deepEqual(courseRatings({ "99/nope": { stars: 3, note: "" }, [key(a)]: { note: "just a note" } }), []);
});

test("dated ratings come newest first, then undated ones in course order, cut at max", () => {
  const notes = {
    [key(a)]: { stars: 4 as const, note: "" },
    [key(b)]: { stars: 1 as const, at: "2026-11-01T00:00:00.000Z", note: "" },
    [key(c)]: { stars: 5 as const, at: "2026-11-09T00:00:00.000Z", note: "" },
  };
  assert.deepEqual(courseRatings(notes).map((r) => r.title), [title(c), title(b), title(a)]);
  assert.equal(courseRatings(notes, 1).length, 1);
});
