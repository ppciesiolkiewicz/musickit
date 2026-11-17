import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { DOC_VERSIONS } from "./versions";

describe("doc versions", () => {
  it("DOC_VERSIONS is the version written in AGENTS.md and in each teaching skill", () => {
    const versionIn = (file: string, re: RegExp) => Number(readFileSync(join(process.cwd(), file), "utf8").match(re)?.[1] ?? NaN);
    assert.equal(versionIn("AGENTS.md", /^Version: (\d+)$/m), DOC_VERSIONS.agents, "AGENTS.md");
    for (const skill of ["teaching-voice", "course-article", "exercise-example", "review-teaching-text"])
      assert.equal(versionIn(`.claude/skills/${skill}/SKILL.md`, /^version: (\d+)$/m), DOC_VERSIONS.teaching, skill);
  });

  it("the newest entry of each section in model/CHANGELOG.md is the version in code", () => {
    const log = readFileSync(join(process.cwd(), "src/features/plan/model/CHANGELOG.md"), "utf8");
    const newest = (section: string) => Number(log.split(`\n## ${section}\n`)[1]?.match(/^### (\d+)/m)?.[1] ?? NaN);
    assert.equal(newest("Prompt"), PROMPT_VERSION, "Prompt");
    assert.equal(newest("Teaching"), DOC_VERSIONS.teaching, "Teaching");
    assert.equal(newest("AGENTS.md"), DOC_VERSIONS.agents, "AGENTS.md");
  });
});
