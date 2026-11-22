import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMPONENT_DOCS, docOf } from "../docs";
import { PATTERNS, isPatternId } from "@/features/rhythm/patterns";
import { CLAP_ALONG_LEVELS, DOUBLE_STOPS_NECK_LEVELS, TOOL_LEVELS } from "./levels";
import { DYAD_DEFAULT_STRINGS, DYAD_NAMES, LIMITS, dyadStrings } from "./double-stops-neck/walk";

const NAMES = ["scale-neck", "chord-shapes", "staff", "backing-band", "note-finder", "interval-ears", "strum-along", "clap-along", "double-stops-neck"];

describe("basics docs", () => {
  it("lists every basic", () => {
    for (const n of NAMES) assert.equal(COMPONENT_DOCS.find((d) => d.name === n)?.kind, "basic", n);
  });
  it("documents the two layers, enable and highlight, and others as optional muted|hidden", () => {
    for (const n of ["scale-neck", "staff", "arpeggio-neck"]) {
      const props = docOf(n)!.props;
      for (const k of ["enable", "highlight"]) assert.equal(props.find((x) => x.name === k)?.required, false, `${n} ${k}`);
      const p = props.find((x) => x.name === "others");
      assert.equal(p?.required, false);
      assert.equal(p?.type, '"muted" | "hidden"');
    }
  });
  it("backing-band requires parts", () => {
    assert.equal(docOf("backing-band")!.props.find((x) => x.name === "parts")?.required, true);
  });
  it("double-stops-neck: the props name every interval and string pair, and the level prop says each level's frets", () => {
    const props = docOf("double-stops-neck")!.props;
    const union = (name: string) => props.find((x) => x.name === name)!.type.split(" | ").map((x) => x.replace(/"/g, ""));
    assert.deepEqual(union("interval"), [...DYAD_NAMES]);
    assert.deepEqual(union("strings"), DYAD_NAMES.flatMap(dyadStrings));
    for (const n of DYAD_NAMES) assert.ok(dyadStrings(n).includes(DYAD_DEFAULT_STRINGS[n]), n);
    const level = props.find((x) => x.name === "level")!.description;
    for (const l of TOOL_LEVELS) {
      const { from, to } = DOUBLE_STOPS_NECK_LEVELS[l];
      assert.ok(level.includes(`frets ${from} to ${to}`), l);
      assert.ok(from >= LIMITS.minFret && to <= LIMITS.maxFret && to - from >= LIMITS.minSpan, l);
    }
  });
  it("clap-along: every level is a pattern of the rhythm game, and the pattern prop lists them all", () => {
    for (const l of TOOL_LEVELS) assert.ok(isPatternId(CLAP_ALONG_LEVELS[l]), l);
    const props = docOf("clap-along")!.props;
    const type = props.find((x) => x.name === "pattern")!.type;
    assert.deepEqual(type.split(" | ").map((x) => x.replace(/"/g, "")), PATTERNS.map((x) => x.id));
    const level = props.find((x) => x.name === "level")!.description;
    for (const l of TOOL_LEVELS) assert.ok(level.includes(`"${l}" ${CLAP_ALONG_LEVELS[l]}`), l);
  });
});
