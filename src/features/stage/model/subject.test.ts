import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KEY } from "@/features/creator/model/key";
import { paletteCatalog } from "./search";
import { sanitiseSubject, subjectTitle } from "./subject";

test("a melody keeps a whole number of beats across from 2 to 16", () => {
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6 }, []), { kind: "melody", beats: 6 });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 1 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 17 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6.5 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody" }, []), { kind: "melody" });
});

test("the video widgets are subjects", () => {
  for (const kind of ["countdown", "intro", "progress", "next"]) assert.deepEqual(sanitiseSubject({ kind }, []), { kind });
});

test("names", () => {
  assert.equal(subjectTitle({ kind: "melody", beats: 6 }), "Melody");
  assert.equal(subjectTitle({ kind: "countdown" }), "Countdown");
  assert.equal(subjectTitle({ kind: "intro" }), "Intro");
  assert.equal(subjectTitle({ kind: "progress" }), "Tune progress");
  assert.equal(subjectTitle({ kind: "next" }), "Up next");
});

test("none of them is offered by the studio's palette", () => {
  const kinds = paletteCatalog(["scale", "chords"], EMPTY_KEY).flatMap((r) => (r.action.type === "add" ? [r.action.subject.kind as string] : []));
  assert.ok(kinds.length > 0);
  for (const k of ["melody", "countdown", "intro", "progress", "next"]) assert.ok(!kinds.includes(k), k);
});
