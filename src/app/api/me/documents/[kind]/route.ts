import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { isDocKind } from "@/features/userData/model";
import { readDoc, writeDoc } from "@/features/userData/server/data";
import { signedIn, userData } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ kind: string }> };

/** The signed-in player's document of this kind: { data }. */
export async function GET(req: Request, { params }: Ctx) {
  const { kind } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  if (!isDocKind(kind)) return json({ error: "Not found." }, 404, me.cookies);
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  return json({ data: await readDoc(store.repo, me.account.id, kind) }, 200, me.cookies);
}

/** Replace the document: JSON { data }. */
export async function PUT(req: Request, { params }: Ctx) {
  const { kind } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  if (!isDocKind(kind)) return json({ error: "Not found." }, 404, me.cookies);
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body || !("data" in body)) return json({ error: "Send { data }." }, 400, me.cookies);
  const done = await writeDoc(store.repo, me.account.id, kind, body.data, new Date());
  if (!done.ok) return done.error === "too-big" ? json({ error: "That is too big to keep." }, 413, me.cookies) : json({ error: "Not found." }, 404, me.cookies);
  return json({ ok: true }, 200, me.cookies);
}
