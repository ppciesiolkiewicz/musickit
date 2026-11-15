/**
 * Copy the newest plan per made-up player and model from tools/prompt-history (gitignored) into
 * src/features/plan/modelPlans/plans.json, so /demo/models/<slug> can show it on the live site. Only plans that parse.
 *
 *   npm run -s publish-model-plans
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { latestByCell } from "../src/features/devtools/model/compare";
import { isOllamaModel, ollamaName } from "../src/features/devtools/model/models";
import { PERSONAS } from "../src/features/devtools/model/personas";
import { API_PRICES } from "../src/features/devtools/model/pricing";
import { listRuns, readRun } from "../src/features/devtools/server/history";
import { modelPlanSlug, type ModelPlan } from "../src/features/plan/modelPlans";

const OUT = path.join(process.cwd(), "src/features/plan/modelPlans/plans.json");

async function main() {
  const cells = [...latestByCell(await listRuns()).values()].filter((r) => r.title !== undefined && r.model !== "pasted");
  const out: Record<string, ModelPlan> = {};
  for (const s of cells.sort((a, b) => a.id.localeCompare(b.id))) {
    const r = await readRun(s.id);
    const persona = PERSONAS.find((p) => p.id === r?.persona);
    if (!r?.reply || !persona || r.model === "pasted") continue;
    const modelLabel = API_PRICES[r.model]?.label ?? (isOllamaModel(r.model) ? ollamaName(r.model) : r.model);
    out[modelPlanSlug(persona.id, r.model)] = { persona: persona.id, player: persona.label, model: r.model, modelLabel, runId: r.id, at: r.at, reply: r.reply };
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(OUT, JSON.stringify(sorted, null, 1) + "\n");
  console.log(`${Object.keys(sorted).length} plans written to ${path.relative(process.cwd(), OUT)}`);
  for (const slug of Object.keys(sorted)) console.log(`  /demo/models/${slug}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
