import { auth, json, NO_ACCOUNTS, readJson } from "@/features/account/server/http";
import { joinWithInvite, viewInvite, type JoinError } from "@/features/account/server/invites";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/** `/join/<token>`, a teacher invite: `{ state, plan, needsSetup }` for the signed-in person. */
export async function GET(req: Request, { params }: Ctx) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const view = await viewInvite(deps, me.account, (await params).token);
  return json({ ...view, needsSetup: me.account.needsSetup, taught: me.account.taught }, 200, me.cookies);
}

const ERRORS: Record<JoinError, { status: number; error: string; field?: string }> = {
  "not-found": { status: 404, error: "This invite link doesn't work. Check the link, or ask us for a new one." },
  used: { status: 410, error: "This invite was already used by another account. Ask us for a new one." },
  taught: { status: 409, error: "This account belongs to a teacher's class, so it can't join as a teacher. Log in with another email." },
  name: { status: 400, error: "Please type your name.", field: "name" },
  terms: { status: 400, error: "Please agree to the terms of use.", field: "terms" },
};

/** Joins with the invite: JSON `{ name, acceptTerms, emailUpdates }` (the first two only for an account with no plan yet). */
export async function POST(req: Request, { params }: Ctx) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const body = await readJson(req);
  const result = await joinWithInvite(deps, me.account, (await params).token, { name: body?.name, acceptTerms: body?.acceptTerms, emailUpdates: body?.emailUpdates });
  if (result.ok) return json({ ok: true, account: result.account }, 200, me.cookies);
  const { status, ...err } = ERRORS[result.error];
  return json(err, status, me.cookies);
}
