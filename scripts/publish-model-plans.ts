/**
 * Writes the newest run per made-up player and model from tools/prompt-history (gitignored), and their assessments, to
 * src/features/devtools/compare/published.json, for the token figures on /dev/costs.
 *
 *   npm run -s publish-model-plans
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { latestByCell } from "../src/features/devtools/model/compare";
import { listAssessments } from "../src/features/devtools/server/assessments";
import { listRuns } from "../src/features/devtools/server/history";

const TABLE = path.join(process.cwd(), "src/features/devtools/compare/published.json");

async function main() {
  const latest = [...latestByCell(await listRuns()).values()].sort((a, b) => a.id.localeCompare(b.id));
  const shown = new Set(latest.map((r) => r.id));
  const assessments = (await listAssessments()).filter((a) => shown.has(a.candidateId)).sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  await writeFile(TABLE, JSON.stringify({ runs: latest, assessments }, null, 1) + "\n");
  console.log(`${latest.length} runs and ${assessments.length} assessments written to ${path.relative(process.cwd(), TABLE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
