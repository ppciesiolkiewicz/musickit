import { devGate } from "@/features/devtools/gate";
import { listAssessments } from "@/features/devtools/server/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every assessment `npm run compare-models -- assess` wrote: plans judged against a reference plan. */
export async function GET() {
  return devGate() ?? Response.json({ assessments: await listAssessments() }, { headers: { "cache-control": "no-store" } });
}
