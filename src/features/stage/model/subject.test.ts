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

test("a countdown is a subject", () => assert.deepEqual(sanitiseSubject({ kind: "countdown" }, []), { kind: "countdown" }));

test("names", () => {
  assert.equal(subjectTitle({ kind: "melody", beats: 6 }), "Melody");
  assert.equal(subjectTitle({ kind: "countdown" }), "Countdown");
});

test("neither is offered by the studio's palette", () => {
  const kinds = paletteCatalog(["scale", "chords"], EMPTY_KEY).flatMap((r) => (r.action.type === "add" ? [r.action.subject.kind as string] : []));
  assert.ok(kinds.length > 0);
  assert.ok(!kinds.includes("melody") && !kinds.includes("countdown"));
});
