import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { readVoice, writeVoice } from "@/features/userData/server/data";
import { signedIn, userData } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in player's singing voice: { data }, a voice type ({ type }), a range of their own ({ range: { low, high } }) or null. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  return json({ data: await readVoice(store.repo, me.account.id) }, 200, me.cookies);
}

/** Replaces it: JSON { data }, in the same shapes; null removes it. */
export async function PUT(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || !("data" in body) || !(await writeVoice(store.repo, me.account.id, body.data, new Date()))) {
    return json({ error: "Send { data }: a voice type, a range, or null." }, 400, me.cookies);
  }
  return json({ ok: true }, 200, me.cookies);
}
