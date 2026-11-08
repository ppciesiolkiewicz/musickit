import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { clearCoverage, listCoverage, registerCoverage } from "./coverage";
import { COVERED_PAGES } from "./coveredPages";
import { TOOL_TOURS } from "./toolTours";

const env = process.env as Record<string, string | undefined>;
const before = env.NODE_ENV;

beforeEach(() => clearCoverage());
afterEach(() => {
  env.NODE_ENV = before;
  clearCoverage();
});

test("registering the same kind:id twice merges levels without duplicates and counts nothing twice", () => {
  registerCoverage({ kind: "page", id: "looper", levels: ["standard"], tourSteps: 5, hints: 0 });
  registerCoverage({ kind: "page", id: "looper", levels: ["standard"], tourSteps: 5, hints: 0 });
  registerCoverage({ kind: "page", id: "looper", levels: ["simple", "standard"], tourSteps: 0, hints: 2 });
  registerCoverage({ kind: "page", id: "looper", levels: [], tourSteps: 0, hints: 2 });
  assert.deepEqual(listCoverage(), [{ kind: "page", id: "looper", levels: ["simple", "standard"], tourSteps: 5, hints: 2 }]);
});

test("a page and a tool of the same id stay apart", () => {
  registerCoverage({ kind: "page", id: "staff", levels: [], tourSteps: 1, hints: 0 });
  registerCoverage({ kind: "tool", id: "staff", levels: ["standard"], tourSteps: 4, hints: 4 });
  assert.equal(listCoverage().length, 2);
});

test("in a production build nothing registers", () => {
  env.NODE_ENV = "production";
  registerCoverage({ kind: "tool", id: "staff", levels: ["standard"], tourSteps: 4, hints: 4 });
  assert.deepEqual(listCoverage(), []);
});

test("entries sort by kind, then id", () => {
  registerCoverage({ kind: "tool", id: "staff", levels: [], tourSteps: 0, hints: 0 });
  registerCoverage({ kind: "page", id: "tuner", levels: [], tourSteps: 0, hints: 0 });
  registerCoverage({ kind: "tool", id: "chord-shapes", levels: [], tourSteps: 0, hints: 0 });
  registerCoverage({ kind: "page", id: "looper", levels: [], tourSteps: 0, hints: 0 });
  assert.deepEqual(listCoverage().map((e) => `${e.kind}:${e.id}`), ["page:looper", "page:tuner", "tool:chord-shapes", "tool:staff"]);
});

test("every page with a guide is in the static list, with its tour", () => {
  const ids = COVERED_PAGES.map((p) => p.id).sort();
  assert.deepEqual(ids, ["arpeggios", "backing", "basics", "caged", "chords", "circle", "course", "ears", "faq", "improv", "looper", "metronome-drone", "notes", "piano", "plan", "rhythm", "scales", "singing", "triads", "tune-by-ear", "tuner", "tunings"]);
  for (const p of COVERED_PAGES) {
    assert.ok(p.route.startsWith("/"), `${p.id}: route`);
    assert.ok(p.tour.length > 0, `${p.id}: tour`);
  }
  assert.ok(Object.keys(TOOL_TOURS).length > 0);
});

/** Every .tsx file under src. */
function sources(): string[] {
  const src = join(process.cwd(), "src");
  return readdirSync(src, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx")).map((f) => join(src, f));
}

test("each file that draws Hints declares how many with useCoverage", () => {
  for (const file of sources()) {
    if (file.endsWith("Hint.tsx")) continue;
    const text = readFileSync(file, "utf8");
    const count = (text.match(/<Hint\s/g) ?? []).length;
    const declared = text.match(/useCoverage\(\{ hints: (\d+) \}\)/);
    if (!count) {
      assert.equal(declared, null, `${file}: declares hints but draws none`);
      continue;
    }
    assert.ok(declared, `${file}: draws ${count} Hint(s) but has no useCoverage({ hints: ${count} })`);
    assert.equal(Number(declared[1]), count, `${file}: draws ${count} Hint(s), declares ${declared[1]}`);
  }
});
