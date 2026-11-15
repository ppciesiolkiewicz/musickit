/**
 * Write a first-week plan for each made-up player with each model, for /dev/compare-models ("Compare AI models for
 * autoplan"). Claude models run through the local claude CLI (your subscription), Ollama models through the local Ollama;
 * every run is saved to tools/prompt-history, where the page reads it and prices it as if sent through the API.
 *
 * `assess` then has one model judge every other plan for a player against its own (model/assess.ts).
 *
 *   npm run -s compare-models -- help
 */
import { catalogue } from "../src/features/plan/model/catalogue";
import { parsePlanConfig } from "../src/features/plan/model/config";
import { JUDGE_MODEL, assessJobs, assessPrompt, isCurrent, parseVerdict, type Assessment } from "../src/features/devtools/model/assess";
import { demoReplyChars, latestByCell, cellKey, personaPrompt, runCost } from "../src/features/devtools/model/compare";
import { describeReply, newRunId, type RunRecord } from "../src/features/devtools/model/history";
import { DEMO_MODELS, isDevModel, isOllamaModel, type DevModel } from "../src/features/devtools/model/models";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { estimateCost, usd } from "../src/features/devtools/model/pricing";
import { listAssessments, saveAssessment } from "../src/features/devtools/server/assessments";
import { runClaude } from "../src/features/devtools/server/claude";
import { listRuns, readRun, saveRun } from "../src/features/devtools/server/history";
import { listOllamaModels, runOllama } from "../src/features/devtools/server/ollama";

const DEFAULT_CLAUDE: DevModel[] = DEMO_MODELS.filter((m) => m !== "claude-fable-5-2");

const HELP = `compare-models [--models a,b] [--players a,b] [--parallel N] [--redo] [--dry]

  --models    which models (default: ${DEFAULT_CLAUDE.join(",")}).
              Claude: ${DEMO_MODELS.join(", ")} (Fable only when named).
              Ollama: ollama (every local model) or ollama:<name>, e.g. ollama:llama3.1:8b
  --players   which made-up players (default: all): ${PERSONAS.map((p) => p.id).join(", ")}
  --parallel  Claude runs at once (default 3); Ollama runs one at a time
  --redo      run again where a plan already exists
  --dry       list the runs and their estimated API cost, run nothing

compare-models assess [--players a,b] [--judge model] [--parallel N] [--redo] [--dry]

  Has the judge (default ${JUDGE_MODEL}) mark every other model's plan for a player against its own plan for that
  player. A player the judge has no plan for is skipped: write one first with --models ${JUDGE_MODEL} --players <id>.
  --redo      judge again where an assessment against today's reference already exists

Plans land in tools/prompt-history, assessments in tools/prompt-history/assessments; open them on /dev/compare-models.`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type ClaudeModel = Exclude<DevModel, `ollama:${string}`>;

/** Runs `n` of `list` at a time, in order. */
const queue = <T>(list: T[], n: number, one: (j: T) => Promise<void>) => Promise.all(Array.from({ length: n }, async () => {
  for (let j = list.shift(); j; j = list.shift()) await one(j);
}));

/** The judge marks every other model's newest plan for a player against its own newest plan for that player. */
async function assess() {
  const judge = arg("judge") ?? JUDGE_MODEL;
  if (!isDevModel(judge) || isOllamaModel(judge)) throw new Error(`The judge is a Claude model: ${DEMO_MODELS.join(", ")}`);
  const players = arg("players")?.split(",") ?? PERSONAS.map((p) => p.id);
  const entries = catalogue();
  const cells = latestByCell(await listRuns());
  const had = new Map((await listAssessments()).map((a) => [a.candidateId, a]));
  const jobs = PERSONAS.filter((p) => players.includes(p.id)).flatMap((p) => {
    const j = assessJobs(p.id, cells, judge);
    if (!j) console.log(`  ${p.id.padEnd(22)} skipped: no plan from ${judge}`);
    return (j?.candidates ?? []).filter((c) => flag("redo") || !isCurrent(had.get(c.id), j!.reference.id)).map((candidate) => ({ p, reference: j!.reference, candidate }));
  });
  console.log(`${jobs.length} plans to judge with ${judge}.`);
  for (const j of jobs) console.log(`  ${j.p.id.padEnd(22)} ${j.candidate.model}`);
  if (flag("dry") || !jobs.length) return;

  const warningsOf = (reply: string) => {
    const r = parsePlanConfig(reply, entries);
    return r.ok ? r.warnings : [];
  };
  await queue(jobs, Math.max(1, Number(arg("parallel") ?? 3)), async (j) => {
    const at = new Date();
    const [ref, cand] = await Promise.all([readRun(j.reference.id), readRun(j.candidate.id)]);
    if (!ref?.reply || !cand?.reply) return console.log(`${j.p.id.padEnd(22)} ${String(j.candidate.model).padEnd(20)} skipped: a plan is missing`);
    const prompt = assessPrompt({ prompt: cand.prompt, reference: { reply: ref.reply, warnings: warningsOf(ref.reply) }, candidate: { reply: cand.reply, warnings: warningsOf(cand.reply) } });
    const out = await runClaude(prompt, { model: judge as ClaudeModel, timeoutMs: 30 * 60_000 });
    const read = out.ok ? parseVerdict(out.text) : null;
    const record: Assessment = {
      candidateId: j.candidate.id, referenceId: j.reference.id, persona: j.p.id, at: at.toISOString(), judge, durationMs: out.durationMs,
      ...(out.ok && out.usage ? { usage: out.usage } : {}),
      ...(!out.ok ? { error: out.error } : read!.ok ? { verdict: read!.verdict } : { error: read!.error, reply: out.text }),
    };
    await saveAssessment(record);
    console.log(`${j.p.id.padEnd(22)} ${String(j.candidate.model).padEnd(20)} ${(out.durationMs / 1000).toFixed(0).padStart(4)} s  ${record.verdict ? `${record.verdict.score}/10  ${record.verdict.summary.slice(0, 100)}` : `failed: ${record.error?.slice(0, 80)}`}`);
  });
}

async function main() {
  if (process.argv.includes("help") || flag("help")) return console.log(HELP);
  if (process.argv.includes("assess")) return assess();
  const local = await listOllamaModels();
  const wanted = (arg("models")?.split(",") ?? DEFAULT_CLAUDE).flatMap((m) => (m === "ollama" ? local : [m]));
  const bad = wanted.filter((m) => !isDevModel(m) || (isOllamaModel(m) && !local.includes(m)));
  if (bad.length) throw new Error(`Unknown or not local: ${bad.join(", ")}. Local Ollama models: ${local.join(", ") || "none (is Ollama running?)"}`);
  const models = wanted as DevModel[];
  const players = arg("players")?.split(",") ?? PERSONAS.map((p) => p.id);
  const personas = PERSONAS.filter((p) => players.includes(p.id));
  const entries = catalogue();
  const replyChars = demoReplyChars();
  const done = latestByCell(await listRuns());

  const jobs = personas.flatMap((p) => models.map((model) => ({ p, model, prompt: personaPrompt(p, entries) })))
    // done means a plan: a reply that isn't one (cut short, say) is written again
    .filter((j) => flag("redo") || !done.get(cellKey(j.p.id, j.model))?.title);
  const est = jobs.reduce((s, j) => s + (estimateCost(j.model, j.prompt.text.length, replyChars)?.usd ?? 0), 0);
  console.log(`${jobs.length} runs, estimated ${usd(est)} at API prices (Ollama models at OpenRouter prices).`);
  for (const j of jobs) console.log(`  ${j.p.id.padEnd(20)} ${j.model}`);
  if (flag("dry") || !jobs.length) return;

  let spent = 0;
  const one = async (j: (typeof jobs)[number]) => {
    const at = new Date();
    const out = isOllamaModel(j.model) ? await runOllama(j.prompt.text, j.model) : await runClaude(j.prompt.text, { model: j.model as ClaudeModel, timeoutMs: 30 * 60_000 });
    const record: RunRecord = {
      id: newRunId(at), at: at.toISOString(), mode: "first", model: j.model, persona: j.p.id, answers: j.p.answers, overrides: {}, parts: j.prompt.parts, prompt: j.prompt.text,
      ...(out.ok ? { reply: out.text, ...describeReply(out.text, entries), ...(out.usage ? { usage: out.usage } : {}) } : { error: out.error }),
      durationMs: out.durationMs,
      ...(out.ok && out.costUsd !== undefined ? { costUsd: out.costUsd } : {}),
    };
    await saveRun(record);
    const cost = runCost(record);
    spent += cost ?? 0;
    const what = record.error ? `failed: ${record.error.slice(0, 80)}` : `${record.title ?? "not a plan"}${record.warnings ? ` (${record.warnings} warnings)` : ""}`;
    console.log(`${j.p.id.padEnd(20)} ${j.model.padEnd(20)} ${(out.durationMs / 1000).toFixed(0).padStart(4)} s  ${cost === null ? "?" : usd(cost)}  ${what}`);
  };
  await Promise.all([
    queue(jobs.filter((j) => !isOllamaModel(j.model)), Math.max(1, Number(arg("parallel") ?? 3)), one),
    queue(jobs.filter((j) => isOllamaModel(j.model)), 1, one),
  ]);
  console.log(`Done: ${usd(spent)} at API prices.`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
