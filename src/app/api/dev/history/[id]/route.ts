import { devGate } from "@/features/devtools/gate";
import { readRun } from "@/features/devtools/server/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One run, whole. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = devGate();
  if (gate) return gate;
  const run = await readRun((await params).id);
  return run ? Response.json(run, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "No such run." }, { status: 404 });
}
