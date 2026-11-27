import { permissionGate } from "@/features/devtools/server/access";
import { SEED_BLOCKS } from "@/features/library/seed";
import { DOC_VERSIONS } from "@/features/library/seed/versions";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";

export const runtime = "nodejs";

/**
 * The versions every seed block file was written to, by block id, and the versions the documents are at now: for the
 * dev line on an exercise card (`BlockVersions`). Read from the files, so it is right before `db:seed-blocks` runs.
 */
export async function GET(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  const blocks = Object.fromEntries(SEED_BLOCKS.map((b) => [b.id, b.versions]));
  return Response.json({ now: { prompt: PROMPT_VERSION, ...DOC_VERSIONS }, blocks });
}
