import { SEED_BLOCKS, seedExercise, type SeedBlockFile } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import type { CourseRating } from "@/features/course/ratings";
import { catalogue, type CatalogueEntry } from "./catalogue";
import { parseExercise } from "./config";
import { promptPartsWith, type PromptPart } from "./promptCore";
import type { PlanAnswers, StoredPlan } from "./types";

// The whole plan prompt, with the part that names the library and its showcase blocks. Everything else is in
// promptCore.ts, which never imports the seed files: the browser's authoring guide (agentBlocks.ts) builds on that one.
export { PROMPT_VERSION, settingsOf, weekByTopic, weekReport, type PromptPart, type PromptPartKind } from "./promptCore";

type Showcase = NonNullable<SeedBlockFile["showcase"]>;

/** What each showcase block shows, in the prompt's words: the one tool feature an agent learns from it. */
export const SHOWCASE_FEATURE: Record<Showcase, string> = {
  blocks: "a section per step, each with its own chart",
  pick: "a voice melody chosen by \"pick\"",
  progression: "one progression worked several ways",
  stages: "a choice that takes a drill up in stages (\"label\": \"stage\")",
  variants: "a choice of equal variants, each a key and a position (\"label\": \"variant\")",
};

let showcases: { feature: string; id: string; title: string }[] | null = null;

/**
 * The seed blocks that each show one tool feature, named by their seed file ids: the ids they are stored under in the
 * library, so `get_block` finds them. A file whose exercise doesn't parse (against the full catalogue, not the entries a
 * prompt is built with) is left out.
 */
export function showcaseBlocks(): { feature: string; id: string; title: string }[] {
  if (!showcases) {
    const entries = catalogue();
    showcases = SEED_BLOCKS.flatMap((f) => {
      if (!f.showcase) return [];
      const block = parseExercise(seedExercise(f), f.id, entries).block;
      return block ? [{ feature: SHOWCASE_FEATURE[f.showcase], id: f.id, title: block.title }] : [];
    });
  }
  return showcases;
}

/** "Find models in the library": how the agent reads the library with its tools, and the showcase block for each tool feature. */
function libraryPart(): PromptPart {
  return { id: "library", label: "Find models in the library", kind: "library", text: [
    "## Find models in the library",
    "The musickit library holds exercises (blocks) written to the rules below, each naming the path steps it practices. Read some before you write, with the library tools:",
    "- Call player_progress first: where the student stands in each topic and concept, and the blocks they have had. With no player in scope it says so; then plan from The student above.",
    `- The current teaching rules are version ${DOC_VERSIONS.teaching}. Search with "docs_teaching": ${DOC_VERSIONS.teaching} first, so you find what is written to them. When that finds too few, search again without it: from an older block take only how the tools are used and the shape, and write the text to the rules in this prompt.`,
    "- For each concept the week works on, call find_blocks with \"steps\" set to the student's current step and the next one (\"trackId:n\", from the list under Answer format). Add \"area\" or \"level\" when the list is long. Then call get_block on the two or three closest and write like them: the same kind of text, the tools used the same way.",
    "- A block that fits the student as it is can go in the plan as it is: copy its exercise whole and unchanged, with its area, topic, concepts, steps and tags. An exercise you write or copy is stored by its content and tags, so the same content and tags are one block. A library block keeps its own fixed id, the one get_block takes.",
    "- library_coverage shows which steps no block practices yet. For those, write a new block from the rules below.",
    "Each of these blocks shows one tool feature. Before you use the feature, call get_block with its id and use the feature the same way. Some are written to older teaching rules, so write the text to the rules in this prompt, not like theirs:",
    ...showcaseBlocks().map((b) => `- ${b.feature}: ${b.id} ("${b.title}")`),
    "",
  ].join("\n") };
}

/**
 * The plan prompt that agents run: in Claude Code with the library tools, and in the devtools runner. It asks for one JSON object
 * only, links only to the catalogue's pages, and balances where the player wants to go with what they need. `previous` (newest
 * first) makes it the next week's prompt.
 */
export function buildPrompt(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = [], course: CourseRating[] = []): string {
  return promptParts(answers, entries, previous, course).map((p) => p.text).join("\n");
}

/** The prompt as labelled parts, in order; each part's text ends with the blank line before the next heading. */
export function promptParts(answers: PlanAnswers | null, entries: CatalogueEntry[], previous: StoredPlan[] = [], course: CourseRating[] = []): PromptPart[] {
  return promptPartsWith(answers, entries, previous, course, libraryPart());
}
