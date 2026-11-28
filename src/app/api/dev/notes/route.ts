import { inArray, sql } from "drizzle-orm";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import { readCopyNotes } from "@/features/devtools/model/copyNotes";
import { permissionGate } from "@/features/devtools/server/access";
import { getDb } from "@/lib/db/client";
import { devNotes } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => Response.json({ error }, { status });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Every dev note, one list for everyone, oldest first. */
export async function GET(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  const db = getDb();
  if (!db) return fail(NO_ACCOUNTS, 503);
  try {
    const rows = await db.select({ note: devNotes.note }).from(devNotes);
    const notes = readCopyNotes(rows.map((r) => r.note)).sort((a, b) => a.at.localeCompare(b.at));
    return Response.json({ notes }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(`The notes couldn't be loaded: ${message(e)}`, 500);
  }
}

/** Change the notes: `{ put: CopyNote[], remove: string[] }`, the new or changed notes and the ids of the ones gone. */
export async function POST(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  const db = getDb();
  if (!db) return fail(NO_ACCOUNTS, 503);
  const body = (await req.json().catch(() => null)) as { put?: unknown; remove?: unknown } | null;
  const put = readCopyNotes(body?.put);
  const remove = Array.isArray(body?.remove) ? body.remove.filter((id): id is string => typeof id === "string") : [];
  if (!body || (Array.isArray(body.put) && put.length !== body.put.length)) return fail("A note was not in the right shape, so nothing was saved.", 400);
  try {
    await db.transaction(async (tx) => {
      if (remove.length) await tx.delete(devNotes).where(inArray(devNotes.id, remove));
      if (put.length)
        await tx
          .insert(devNotes)
          .values(put.map((n) => ({ id: n.id, note: n })))
          .onConflictDoUpdate({ target: devNotes.id, set: { note: sql`excluded.note`, updatedAt: sql`now()` } });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(`The notes couldn't be saved: ${message(e)}`, 500);
  }
}
