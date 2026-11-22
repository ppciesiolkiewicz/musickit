import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMPONENT_DOCS, docOf } from "../docs";
import { PATTERNS, isPatternId } from "@/features/rhythm/patterns";
import { CLAP_ALONG_LEVELS, TOOL_LEVELS } from "./levels";

const NAMES = ["scale-neck", "chord-shapes", "staff", "backing-band", "note-finder", "interval-ears", "strum-along", "clap-along"];

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
  it("clap-along: every level is a pattern of the rhythm game, and the pattern prop lists them all", () => {
    for (const l of TOOL_LEVELS) assert.ok(isPatternId(CLAP_ALONG_LEVELS[l]), l);
    const props = docOf("clap-along")!.props;
    const type = props.find((x) => x.name === "pattern")!.type;
    assert.deepEqual(type.split(" | ").map((x) => x.replace(/"/g, "")), PATTERNS.map((x) => x.id));
    const level = props.find((x) => x.name === "level")!.description;
    for (const l of TOOL_LEVELS) assert.ok(level.includes(`"${l}" ${CLAP_ALONG_LEVELS[l]}`), l);
  });
});
