/** The versions of the documents a seed file or an example is written to. */
export interface DocVersions {
  /** `Version:` in AGENTS.md at the repo root; 0: before it was versioned */
  agents: number;
  /** `version:` of the teaching skills (.claude/skills: teaching-voice, course-article, exercise-example, review-teaching-text); 0: the older style, before them */
  teaching: number;
}

/** The versions those documents are at now. Bump one here in the same commit as the document; versions.test.ts holds the two together. */
export const DOC_VERSIONS: DocVersions = { agents: 2, teaching: 7 };
