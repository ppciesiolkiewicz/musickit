import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { TOOLS, type ToolName } from "../plan/model/tools";
import { TOOL_TOURS, toolTourSeenKey } from "./toolTours";

/** the repo root: tests run from it */
const ROOT = process.cwd();

/**
 * Where each tool is drawn, from the repo root: its folder under `src/features/exercises/basics/` and the shared player
 * it hands off to. The last test checks every step's target is a `data-tour="…"` literal somewhere in these files.
 */
const TOOL_TOUR_SOURCES: Record<ToolName, string[]> = (() => {
  const basics = (t: string) => `src/features/exercises/basics/${t}`;
  const sing = "src/features/exercises/basics/sing-along";
  const drills = "src/features/exercises/basics/DrillPlayer.tsx";
  const bandSrc = "src/features/instruments/band/views/BarView.tsx";
  return {
    "scale-neck": [basics("scale-neck")],
    "position-neck": [basics("position-neck")],
    "arpeggio-neck": [basics("arpeggio-neck")],
    "chord-shapes": [basics("chord-shapes")],
    staff: [basics("staff")],
    "backing-band": [basics("backing-band"), bandSrc],
    "note-finder": [basics("note-finder"), "src/components/practice/NoteGame.tsx"],
    "interval-ears": [basics("interval-ears"), "src/components/practice/EarGame.tsx"],
    "tuning-ears": [basics("tuning-ears")],
    "melody-singer": [basics("melody-singer"), sing],
    "run-singer": [basics("run-singer"), sing],
    "string-singer": [basics("string-singer"), sing],
    "interval-singer": [basics("interval-singer")],
    "guitar-play-along": ["src/features/exercises/play-along"],
    "backing-track": [basics("backing-track"), "src/features/backing/ui/BackingTrack.tsx"],
    "strum-along": [basics("strum-along")],
    "finger-pattern": [basics("finger-pattern"), drills],
    "picking-drill": [basics("picking-drill"), drills],
    "legato-trill": [basics("legato-trill"), drills],
  };
})();

test("every plan tool has a tour, and only plan tools do", () => {
  assert.deepEqual(Object.keys(TOOL_TOURS).sort(), Object.keys(TOOLS).sort());
});

test("every tour has steps with a title and text", () => {
  for (const [type, steps] of Object.entries(TOOL_TOURS)) {
    assert.ok(steps.length >= 1, `${type} has no steps`);
    assert.ok(steps.length <= 4, `${type} has more than 4 steps`);
    for (const s of steps) {
      assert.ok(s.target.trim(), `${type}: a step without a target`);
      assert.ok(s.title.trim(), `${type}: ${s.target} has no title`);
      assert.ok(s.text.trim(), `${type}: ${s.target} has no text`);
    }
  }
});

test("seen key per tool type", () => {
  assert.equal(toolTourSeenKey("staff"), "musickit.tour.tool.staff");
});

/** Every .tsx file under a source path (a file or a folder). */
function tsxFiles(path: string): string[] {
  const full = join(ROOT, path);
  if (!statSync(full).isDirectory()) return [full];
  return readdirSync(full, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx")).map((f) => join(full, f));
}

/**
 * Each step's target must be written as a `data-tour="<target>"` literal in the code that draws that tool: the files
 * `TOOL_TOUR_SOURCES` lists for it (its own folder under `src/features/exercises/basics/`, plus the shared player it
 * hands off to). A literal, not a computed value, so a renamed or deleted target fails here instead of silently
 * dropping its step at run time.
 */
test("every step's target is a data-tour literal in its tool's source", () => {
  for (const [type, steps] of Object.entries(TOOL_TOURS)) {
    const sources = TOOL_TOUR_SOURCES[type as keyof typeof TOOL_TOURS];
    assert.ok(sources?.length, `${type} has no source paths`);
    const code = sources.flatMap(tsxFiles).map((f) => readFileSync(f, "utf8")).join("\n");
    const found = new Set([...code.matchAll(/data-tour="([^"]+)"/g)].map((m) => m[1]));
    for (const s of steps) assert.ok(found.has(s.target), `${type}: no data-tour="${s.target}" in ${sources.join(", ")}`);
  }
});
