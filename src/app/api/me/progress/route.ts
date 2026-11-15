import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { putEntry, readEntries } from "@/features/userData/server/data";
import { signedIn, userData } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



/** The signed-in player's progress log: { entries }. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  return json({ entries: await readEntries(store.repo, me.account.id) }, 200, me.cookies);
}

/** Store one entry, replacing the exercise's earlier one: JSON { entry }. */
export async function PUT(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || !(await putEntry(store.repo, me.account.id, body.entry, new Date()))) return json({ error: "Send { entry }." }, 400, me.cookies);
  return json({ ok: true }, 200, me.cookies);
}

/** Remove the exercise's entry: ?exercise=<id>. */
export async function DELETE(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const id = new URL(req.url).searchParams.get("exercise");
  if (!id) return json({ error: "Send ?exercise=<id>." }, 400, me.cookies);
  await store.repo.removeProgress(me.account.id, id);
  return json({ ok: true }, 200, me.cookies);
}
