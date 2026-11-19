import { devOrAdminGate } from "@/features/devtools/server/access";
import { readRun } from "@/features/devtools/server/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One run, whole. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await devOrAdminGate(req);
  if (gate) return gate;
  const run = await readRun((await params).id);
  return run ? Response.json(run, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "No such run." }, { status: 404 });
}
