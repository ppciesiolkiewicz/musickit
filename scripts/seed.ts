/**
 * Tools for writing the library seed (src/features/library/seed, README there) by hand or with an agent.
 *
 *   npm run -s seed -- prompt <persona id | answers.json> [out.txt]   the live plan writer's prompt for that player
 *   npm run -s seed -- check <file.json>...                          read a seed file as the app would, and say what is wrong
 *   npm run -s seed -- versions                                      the versions a new file records
 *
 * `check` exits 1 when a file has a problem. A parser warning is a problem: a seed file must read with none.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { composePrompt } from "../src/features/devtools/model/compose";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { expandPlan, exerciseOf, isChoiceName } from "../src/features/library/seed/choices";
import type { SeedBlockFile, SeedPlanFile } from "../src/features/library/seed";
import { dayRefs } from "../src/features/library/seed/dayRefs";
import { movesProblems } from "../src/features/library/seed/movesCheck";
import { choiceSetProblems } from "../src/features/plan/model/choiceSet";
import { DOC_VERSIONS } from "../src/features/library/seed/versions";
import { catalogue } from "../src/features/plan/model/catalogue";
import { conceptById } from "../src/features/plan/model/concepts";
import { parseExercise, parsePlanConfig } from "../src/features/plan/model/config";
import { LADDERS } from "../src/features/plan/model/ladders";
import { stepAt, stepOf } from "../src/features/plan/model/path";
import { PROMPT_VERSION, promptParts } from "../src/features/plan/model/prompt";
import { isCuratedId } from "../src/features/plan/model/blockId";
import { toolsOf } from "../src/features/plan/model/tools";
import type { PlanAnswers, PlanExercise } from "../src/features/plan/model/types";

const VERSIONS = { prompt: PROMPT_VERSION, agents: DOC_VERSIONS.agents, teaching: DOC_VERSIONS.teaching };

function answersOf(arg: string): PlanAnswers {
  const persona = PERSONAS.find((p) => p.id === arg);
  if (persona) return persona.answers;
  return JSON.parse(readFileSync(arg, "utf8")) as PlanAnswers;
}

/**
 * What is wrong with one exercise beyond the parser: no concept, no steps (a warm-up needs neither: it counts for no step; it needs its `warmUpPart`), a word naming another day of the week, a named step with a ladder that none of its
 * tools sits on, or a laddered concept whose tools say no step. (A step of a track that is not one of its concepts, or no
 * step at all, is already a parser warning.)
 */
function exerciseProblems(e: PlanExercise, where: string): string[] {
  const out: string[] = [];
  if (!e.concepts?.length && e.kind !== "warm-up") out.push(`${where}: tags no concept, so it counts for no skill or step.`);
  if (e.kind === "warm-up" && !e.warmUpPart) out.push(`${where}: a warm-up with no "warmUpPart" (1, 2 or 3: where in its area's warm-up run it goes).`);
  if (!e.steps?.length && e.kind !== "warm-up") out.push(`${where}: names no step ("steps": ["trackId:n"]), so the library finds it by level only.`);
  const days = dayRefs(e);
  if (days.length) out.push(`${where}: names another day (${[...new Set(days)].map((d) => `"${d}"`).join(", ")}); the composer hands a block out alone, so say what to play, not when.`);
  const tools = toolsOf(e.cells);
  for (const ref of e.steps ?? []) {
    const ladder = stepAt(ref)?.step.ladder;
    if (!ladder) continue;
    const [id, key] = ladder.split(":");
    const read = LADDERS.find((x) => x.id === id)?.read;
    if (read && !tools.some((t) => read(t) === key)) out.push(`${where}: names ${ref}, but none of its tools sits on that step (${ladder}).`);
  }
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

const BLOCKS_DIR = path.join(__dirname, "../src/features/library/seed/blocks");
const blockFiles = (): SeedBlockFile[] =>
  readdirSync(BLOCKS_DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(BLOCKS_DIR, f), "utf8")) as SeedBlockFile);

function check(file: string): string[] {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const problems: string[] = [];
  const id = path.basename(file, ".json");
  if (raw.id !== id) problems.push(`id "${String(raw.id)}" is not the file name "${id}".`);
  if (typeof raw.model !== "string" || !raw.model) problems.push("no model.");
  if (typeof raw.note !== "string" || !raw.note) problems.push("no note saying which gap it fills.");
  const v = raw.versions as typeof VERSIONS | undefined;
  if (!v || v.prompt !== VERSIONS.prompt || v.agents !== VERSIONS.agents || v.teaching !== VERSIONS.teaching) problems.push(`versions ${JSON.stringify(v)} are not the current ${JSON.stringify(VERSIONS)}.`);
  // rules newer than a file are not held against it: an older file is read in the shape it was written in
  const current = !!v && v.prompt === VERSIONS.prompt && v.agents === VERSIONS.agents && v.teaching === VERSIONS.teaching;
  const newRules = (e: PlanExercise, where: string) => (current ? movesProblems(e, where) : []);
  const entries = catalogue();
  if ("plan" in raw) {
    if (!raw.answers) problems.push("no answers: say which player the plan is for.");
    const expanded = expandPlan(raw as unknown as SeedPlanFile, blockFiles());
    if (expanded.errors.length) return [...problems, ...expanded.errors];
    const r = parsePlanConfig(JSON.stringify(expanded.plan), entries);
    if (!r.ok) return [...problems, `the plan does not parse: ${r.error}`];
    problems.push(...r.warnings);
    r.config.days.forEach((d, i) => d.exercises.forEach((e, j) => problems.push(...exerciseProblems(e, `Day ${i + 1}, exercise ${j + 1}`), ...newRules(e, `Day ${i + 1}, exercise ${j + 1}`))));
  } else if ("exercise" in raw) {
    if (!isCuratedId(raw.id)) problems.push(`id "${String(raw.id)}" is not a curated id: two or more lowercase words joined by hyphens.`);
    const file_ = raw as unknown as SeedBlockFile;
    if (!Array.isArray(file_.choices) || !file_.choices.length) return [...problems, 'no "choices": a block lists at least one.'];
    const seen = new Set<string>();
    for (const c of file_.choices) {
      const where = `${id}/${String(c.name)}`;
      if (!isChoiceName(c.name)) problems.push(`${where}: the choice name is not lowercase words joined by hyphens.`);
      if (seen.has(c.name)) problems.push(`${where}: a second choice with this name.`);
      seen.add(c.name);
      problems.push(...choiceSetProblems(file_.exercise, c, where));
      const { block, warnings } = parseExercise(exerciseOf(file_, c), where, entries);
      if (!block) problems.push(`${where}: the exercise does not parse.`);
      else problems.push(...warnings, ...exerciseProblems(block, where), ...newRules(block, where));
    }
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
