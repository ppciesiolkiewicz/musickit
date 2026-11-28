/**
 * The files behind each version a seed file, an article or a course section records: where the rules are written, where
 * the number they are at now is kept, and the changelog section that says what each version changed. Shown when a
 * version label is hovered (`VersionLine`, `VersionBadges`). Paths only, no imports, so client code can read it.
 */
export type VersionKey = "prompt" | "agents" | "teaching" | "voice";

export const CHANGELOG = "src/features/plan/model/CHANGELOG.md";

export const VERSION_DOCS: Record<VersionKey, { what: string; rules: string[]; now: string; changelog: string }> = {
  prompt: {
    what: "The plan prompt",
    rules: ["src/features/plan/model/prompt.ts", "src/features/plan/model/promptCore.ts", "src/features/plan/model/agentBlocks.ts", "src/features/plan/model/agentTools.ts", "src/features/plan/ui/useBlockAgentTools.ts"],
    now: "PROMPT_VERSION in src/features/plan/model/promptCore.ts",
    changelog: "Prompt",
  },
  agents: {
    what: "AGENTS.md",
    rules: ["AGENTS.md"],
    now: "\"Version:\" in AGENTS.md, DOC_VERSIONS.agents in src/features/library/seed/versions.ts",
    changelog: "AGENTS.md",
  },
  teaching: {
    what: "The teaching skills",
    rules: ["teaching-voice", "course-article", "exercise-example", "review-teaching-text"].map((s) => `.claude/skills/${s}/SKILL.md`),
    now: "\"version:\" in each skill, DOC_VERSIONS.teaching in src/features/library/seed/versions.ts",
    changelog: "Teaching",
  },
  voice: {
    what: "The articles' voice",
    rules: [".claude/skills/article-voice/SKILL.md"],
    now: "\"version:\" in the skill, ARTICLE_VOICE_VERSION in src/features/articles/model.ts",
    changelog: "Article voice",
  },
};

/** Where each kind of written thing records the versions it was written to. */
export const RECORDED_IN = {
  block: (id: string) => `src/features/library/seed/blocks/${id}.json`,
  plan: (id: string) => `src/features/library/seed/plans/${id}.json`,
  article: (slug: string) => `src/features/articles/seeds/${slug}.json`,
  lesson: (slug: string) => `src/features/course/lessons/${slug}.ts`,
};

/**
 * The hover text of one version label: where it stands, then the files responsible for it. `recordedIn` is the file
 * that holds the written-to number, or a sentence saying why there is none.
 */
export function versionTitle(key: VersionKey, was: number | null, now: number, recordedIn?: string): string {
  const d = VERSION_DOCS[key];
  const state = was === null ? `not recorded; now ${now}` : was < now ? `written to ${was}, now ${now} (behind)` : `written to ${was}, the current version`;
  return [
    `${d.what}: ${state}`,
    "",
    "The rules:",
    ...d.rules.map((f) => `  ${f}`),
    `The number now: ${d.now}`,
    ...(recordedIn ? [was === null ? recordedIn : `Written to: versions.${key} in ${recordedIn}`] : []),
    `What each version changed: "${d.changelog}" in ${CHANGELOG}`,
  ].join("\n");
}
