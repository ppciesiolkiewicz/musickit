import { BLOCK_LIMIT, findBlocks, getBlock, libraryCoverage, playerProgress, type Deps, type FindOrder } from "./query";
import type { BlockFilter, PlayerMode, Scope } from "./types";

export interface ToolDef { name: string; description: string; inputSchema: object }
export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

type Arg =
  | { type: "string"; description: string }
  | { type: "integer"; description: string }
  | { type: "boolean"; description: string }
  | { type: "strings"; description: string }
  | { type: "enum"; values: readonly string[]; description: string };

interface Spec { description: string; args: Record<string, Arg>; required?: string[] }

const str = (description: string): Arg => ({ type: "string", description });
const int = (description: string): Arg => ({ type: "integer", description });
const list = (description: string): Arg => ({ type: "strings", description });
const oneOf = (values: readonly string[], description: string): Arg => ({ type: "enum", values, description });

const VERSIONS = {
  model: str("The AI model that wrote it."),
  prompt_version: int("The version of the AI plan prompt it was written with."),
  docs_agents: int("The version of AGENTS.md it was written to."),
  docs_teaching: int("The version of the teaching skills it was written to."),
};

const SPECS: Record<string, Spec> = {
  find_blocks: {
    description:
      "List exercise blocks (one exercise: a title and its tools), with how much they have been used by all players together. " +
      "A library block is served through its choices: each choice is one way to play the block, with its own level, path steps, moves (the keys and tempos it may be played in; null when none) and minutes. " +
      "choices lists a library block's active choices by place; a player's own block has none ([]) and its own level and steps. " +
      "A library block's level is its first choice's and its steps are all its choices' steps together. " +
      "Use it to find blocks to reuse or to see what the library holds on a topic. Stars say how the player is doing with a block, not how good the block is. " +
      "mine: 'unused' is library blocks the player does not have yet, 'had' is blocks the player has had, 'repeat' is blocks the player had and last rated 1 to 3 stars. " +
      "order: 'least-used' (default) is the fewest seconds practised first, 'random-least-used' picks at random from the least used fifth, 'newest' is the newest first. " +
      `The answer is capped: ${BLOCK_LIMIT.default} blocks by default, at most ${BLOCK_LIMIT.max}. A full page may mean there are more.`,
    args: {
      area: str("An area id: guitar, voice or theory."),
      topic: str("A topic id."),
      concepts: list("Concept ids; a block with any of them matches."),
      level: str("A level: new, beginner, intermediate or advanced. A library block matches when one of its choices has it. Blocks written before steps have only a level."),
      steps: list("Path step refs, \"trackId:n\" (n from 1, as in library_coverage); a block matches when it, or one of its choices, names any of them."),
      tags: list("Tags; a block with all of them matches."),
      ...VERSIONS,
      mine: oneOf(["unused", "had", "repeat"], "Only blocks by the player's history with them. Needs a player."),
      order: oneOf(["least-used", "random-least-used", "newest"], "The order of the list."),
      limit: int(`How many blocks, 1 to ${BLOCK_LIMIT.max}. Default ${BLOCK_LIMIT.default}.`),
    },
  },
  get_block: {
    description:
      "One block with its full content, its parent block id, its tags, its choices (level, path steps, moves and minutes of each; [] for a player's own block) and its use by all players together (all its choices together). " +
      "With a player in scope it also returns mine: that player's own history with the block (their latest stars and their timer totals).",
    args: { id: str("The block id.") },
    required: ["id"],
  },
  library_coverage: {
    description:
      "How much the library holds for every topic at every level, for every concept and for every path step: blocks, times practised and seconds. " +
      "Steps are \"trackId:n\", in path order (easiest first); a block counts for a step only when it names it. " +
      "blocks counts choices: a library block counts once for each of its choices at that level or naming that step; times and seconds count each block once. " +
      "Read this first to see which steps are thin. A zero row means nothing there yet. " +
      "Without a player in scope the counts are the library; with one they also include that player's own private blocks.",
    args: {},
  },
  player_progress: {
    description:
      "Where the player stands today in every topic and concept (from their ratings, questionnaires and timer), and the blocks they have had. Needs a player. " +
      `blocks holds at most ${BLOCK_LIMIT.max} of them, least used first; blocksTotal is how many they have had in all.`,
    args: {},
  },
};

const jsonType = (a: Arg): object =>
  a.type === "strings" ? { type: "array", items: { type: "string" }, description: a.description }
  : a.type === "enum" ? { type: "string", enum: [...a.values], description: a.description }
  : { type: a.type, description: a.description };

export const LIBRARY_TOOLS: ToolDef[] = Object.entries(SPECS).map(([name, s]) => ({
  name,
  description: s.description,
  inputSchema: {
    type: "object",
    properties: Object.fromEntries(Object.entries(s.args).map(([k, a]) => [k, jsonType(a)])),
    ...(s.required ? { required: s.required } : {}),
    additionalProperties: false,
  },
}));

/** Scope-like keys a caller may send. They are ignored: the scope comes from the server, never from the arguments. */
const IGNORED = new Set(["player", "includeNotEnabled", "include_not_enabled"]);

type Parsed = { ok: true; values: Record<string, unknown> } | { ok: false; error: string };

/** Checks the arguments against the tool's shape by hand. */
function parseArgs(spec: Spec, tool: string, args: unknown): Parsed {
  if (args === undefined || args === null) args = {};
  if (typeof args !== "object" || Array.isArray(args)) return { ok: false, error: `${tool}: the arguments must be an object` };
  const given = args as Record<string, unknown>;
  const values: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(given)) {
    if (IGNORED.has(key)) continue;
    if (!Object.hasOwn(spec.args, key)) return { ok: false, error: `${tool}: unknown argument "${key}"` };
    const a = spec.args[key];
    const v = given[key];
    if (v === undefined) continue;
    if (a.type === "string" && !(typeof v === "string" && v !== "")) return { ok: false, error: `"${key}" must be a non-empty string` };
    if (a.type === "integer" && !(typeof v === "number" && Number.isInteger(v))) return { ok: false, error: `"${key}" must be a whole number` };
    if (a.type === "boolean" && typeof v !== "boolean") return { ok: false, error: `"${key}" must be true or false` };
    if (a.type === "strings" && !(Array.isArray(v) && v.every((x) => typeof x === "string"))) return { ok: false, error: `"${key}" must be a list of strings` };
    if (a.type === "enum" && !(typeof v === "string" && a.values.includes(v))) return { ok: false, error: `"${key}" must be one of: ${a.values.join(", ")}` };
    values[key] = v;
  }
  for (const key of spec.required ?? []) if (!Object.hasOwn(values, key)) return { ok: false, error: `"${key}" is required` };
  return { ok: true, values };
}

const versions = (v: Record<string, unknown>) => ({
  model: v.model as string | undefined,
  promptVersion: v.prompt_version as number | undefined,
  docsAgents: v.docs_agents as number | undefined,
  docsTeaching: v.docs_teaching as number | undefined,
});

/** Runs one tool. The scope is the server's; `player` and `includeNotEnabled` in `args` are ignored. */
export async function callTool(d: Deps, scope: Scope, name: string, args: unknown): Promise<ToolResult> {
  const spec = Object.hasOwn(SPECS, name) ? SPECS[name] : undefined;
  if (!spec) return { ok: false, error: `unknown tool "${name}"` };
  const parsed = parseArgs(spec, name, args);
  if (!parsed.ok) return parsed;
  const v = parsed.values;
  const noPlayer = scope.player === undefined ? "no player in scope" : null;
  switch (name) {
    case "find_blocks": {
      if (v.mine !== undefined && noPlayer) return { ok: false, error: `"mine": ${noPlayer}` };
      const filter: BlockFilter = {
        area: v.area as string | undefined, topic: v.topic as string | undefined, concepts: v.concepts as string[] | undefined,
        level: v.level as string | undefined, steps: v.steps as string[] | undefined, tags: v.tags as string[] | undefined, ...versions(v), player: v.mine as PlayerMode | undefined,
      };
      return { ok: true, data: await findBlocks(d, scope, filter, v.order as FindOrder | undefined, v.limit as number | undefined) };
    }
    case "get_block": {
      const b = await getBlock(d, scope, v.id as string);
      return b ? { ok: true, data: b } : { ok: false, error: `no block "${v.id}"` };
    }
    case "library_coverage":
      return { ok: true, data: await libraryCoverage(d, scope) };
    case "player_progress": {
      const progress = await playerProgress(d, scope);
      return progress ? { ok: true, data: progress } : { ok: false, error: noPlayer ?? "no player in scope" };
    }
    default:
      return { ok: false, error: `unknown tool "${name}"` };
  }
}
