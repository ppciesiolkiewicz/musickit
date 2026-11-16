/**
 * Tools for writing the library seed (src/features/library/seed, README there) by hand or with an agent.
 *
 *   npm run -s seed -- prompt <persona id | answers.json> [out.txt]   the live plan writer's prompt for that player
 *   npm run -s seed -- check <file.json>...                          read a seed file as the app would, and say what is wrong
 *   npm run -s seed -- versions                                      the versions a new file records
 *
 * `check` exits 1 when a file has a problem. A parser warning is a problem: a seed file must read with none.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { composePrompt } from "../src/features/devtools/model/compose";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { DOC_VERSIONS } from "../src/features/plan/examples";
import { catalogue } from "../src/features/plan/model/catalogue";
import { conceptById } from "../src/features/plan/model/concepts";
import { parseExercise, parsePlanConfig } from "../src/features/plan/model/config";
import { LADDERS } from "../src/features/plan/model/ladders";
import { stepOf } from "../src/features/plan/model/path";
import { PROMPT_VERSION, promptParts } from "../src/features/plan/model/prompt";
import { toolsOf } from "../src/features/plan/model/tools";
import type { PlanAnswers, PlanExercise } from "../src/features/plan/model/types";

const VERSIONS = { prompt: PROMPT_VERSION, agents: DOC_VERSIONS.agents, teaching: DOC_VERSIONS.teaching };

function answersOf(arg: string): PlanAnswers {
  const persona = PERSONAS.find((p) => p.id === arg);
  if (persona) return persona.answers;
  return JSON.parse(readFileSync(arg, "utf8")) as PlanAnswers;
}

/** What is wrong with one exercise beyond the parser: no concept, or a laddered concept whose tools say no step. */
function exerciseProblems(e: PlanExercise, where: string): string[] {
  const out: string[] = [];
  if (!e.concepts?.length) out.push(`${where}: tags no concept, so it counts for no skill or step.`);
  const tools = toolsOf(e.cells);
  for (const id of e.concepts ?? []) {
    const c = conceptById(id)!;
    const ladders = new Set(c.steps.flatMap((s) => (s.ladder ? [s.ladder.split(":")[0]] : [])));
    // a tool of the skill's own ladder that says no step: written with raw settings instead of `level` or a stage
    // a ladder with no `read` can't say whose tool it is: it counts no tool as its own
    const own = tools.filter((t) => [...ladders].some((l) => {
      const read = LADDERS.find((x) => x.id === l)?.read;
      return read !== undefined && read({ ...t, level: "new" } as never) !== null;
    }));
    if (own.length && stepOf(c.id, own) === null) out.push(`${where}: ${c.id} has steps a tool knows, but its ${own[0].type} sets no level or stage: it counts for no step.`);
  }
  return out;
}

function check(file: string): string[] {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const problems: string[] = [];
  const id = path.basename(file, ".json");
  if (raw.id !== id) problems.push(`id "${String(raw.id)}" is not the file name "${id}".`);
  if (typeof raw.model !== "string" || !raw.model) problems.push("no model.");
  if (typeof raw.note !== "string" || !raw.note) problems.push("no note saying which gap it fills.");
  const v = raw.versions as typeof VERSIONS | undefined;
  if (!v || v.prompt !== VERSIONS.prompt || v.agents !== VERSIONS.agents || v.teaching !== VERSIONS.teaching) problems.push(`versions ${JSON.stringify(v)} are not the current ${JSON.stringify(VERSIONS)}.`);
  const entries = catalogue();
  if ("plan" in raw) {
    if (!raw.answers) problems.push("no answers: say which player the plan is for.");
    const r = parsePlanConfig(JSON.stringify(raw.plan), entries);
    if (!r.ok) return [...problems, `the plan does not parse: ${r.error}`];
    problems.push(...r.warnings);
    r.config.days.forEach((d, i) => d.exercises.forEach((e, j) => problems.push(...exerciseProblems(e, `Day ${i + 1}, exercise ${j + 1}`))));
  } else if ("exercise" in raw) {
    const { block, warnings } = parseExercise(raw.exercise, id, entries);
    if (!block) return [...problems, "the exercise does not parse."];
    problems.push(...warnings, ...exerciseProblems(block, id));
  } else problems.push('neither "plan" nor "exercise".');
  return problems;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "prompt" && args[0]) {
  const { text } = composePrompt(promptParts(answersOf(args[0]), catalogue(), []), {});
  if (args[1]) {
    writeFileSync(args[1], text);
    console.log(`${text.length} characters written to ${args[1]}`);
  } else process.stdout.write(text);
} else if (cmd === "check" && args.length) {
  let bad = 0;
  for (const f of args) {
    const p = check(f);
    console.log(p.length ? `✖ ${f}\n${p.map((x) => `  - ${x}`).join("\n")}` : `✔ ${f}`);
    if (p.length) bad++;
  }
  process.exit(bad ? 1 : 0);
} else if (cmd === "versions") {
  console.log(JSON.stringify(VERSIONS));
} else {
  console.log("npm run -s seed -- prompt <persona id | answers.json> [out.txt] | check <file.json>... | versions");
  console.log(`personas: ${PERSONAS.map((p) => p.id).join(", ")}`);
  process.exit(cmd ? 1 : 0);
}
