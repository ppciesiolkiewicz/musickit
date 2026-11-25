import { permissionGate } from "@/features/devtools/server/access";
import { exampleCommits } from "@/features/devtools/server/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The checkout's HEAD and each example file's last commit (and uncommitted edits), for the examples page's comments. */
export async function GET(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  try {
    return Response.json(await exampleCommits(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
