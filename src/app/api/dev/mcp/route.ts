import { devGate } from "@/features/devtools/gate";
import { handleRpc } from "@/features/library/server/mcp";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

/** The library tools as a local MCP server (streamable HTTP, stateless, plain JSON). See `.mcp.json`. */
export async function POST(request: Request) {
  const blocked = devGate();
  if (blocked) return blocked;
  const db = getDb();
  if (!db) return new Response("No database: set DATABASE_URL.", { status: 503, headers: NO_STORE });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { headers: NO_STORE });
  }
  const answer = await handleRpc({ library: drizzleLibraryRepo(db), userData: drizzleUserDataRepo(db) }, body);
  return answer.body === undefined ? new Response(null, { status: answer.status, headers: NO_STORE }) : Response.json(answer.body, { status: answer.status, headers: NO_STORE });
}

export function GET() {
  return devGate() ?? new Response("Method not allowed", { status: 405, headers: { allow: "POST", ...NO_STORE } });
}
