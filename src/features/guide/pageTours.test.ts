import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TourStep } from "./tour";

/** the repo root: tests run from it */
const ROOT = process.cwd();
const TOURS = join(ROOT, "src/features/guide/tours");

/**
 * Every `data-tour` value written in the app's source: a plain literal, or each string literal inside a `{...}` expression.
 * A `tour` prop (the band's `PartCard tour="jam-drone"`, which sets `data-tour={tour}`) counts the same way.
 */
function dataTourLiterals(): Set<string> {
  const found = new Set<string>();
  const files = readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx"));
  for (const f of files) {
    const code = readFileSync(join(ROOT, "src", f), "utf8");
    for (const m of code.matchAll(/(?:data-tour|\btour)=(?:"([^"]+)"|\{([^}]*)\})/g)) {
      if (m[1]) found.add(m[1]);
      else for (const s of m[2].matchAll(/"([^"]+)"/g)) found.add(s[1]);
    }
  }
  return found;
}

/**
 * The page tours (`tours/*.ts`) are checked here the way `toolTours.test.ts` checks the tool tours: each step's target
 * must be written as a `data-tour` string literal somewhere in `src`, so a renamed or deleted target fails here instead of
 * silently dropping its step at run time.
 */
test("every page tour step's target is a data-tour literal in the source", async () => {
  const found = dataTourLiterals();
  const files = readdirSync(TOURS).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  assert.ok(files.length > 0, "no page tours found");
  let steps = 0;
  for (const f of files) {
    const mod = (await import(join(TOURS, f))) as Record<string, unknown>;
    const tours = Object.values(mod).filter((v): v is TourStep[] => Array.isArray(v));
    assert.ok(tours.length > 0, `${f} exports no tour`);
    for (const tour of tours)
      for (const s of tour) {
        steps++;
        assert.ok(found.has(s.target), `${f}: no data-tour="${s.target}" in src`);
      }
  }
  assert.ok(steps > 0);
});
