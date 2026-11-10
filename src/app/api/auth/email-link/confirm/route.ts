import { openEmailLink } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson, resultCookies, resultPath, sameOrigin } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The button on /login/confirm: spends the mailed token. JSON { token }. Answers { ok, redirect } with the session
 * cookie set, or with the ticket cookie and the finish form's address when the email has no account yet.
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await readJson(req);
  const result = await openEmailLink(deps, body?.token, req.headers.get("user-agent"));
  if (!result) return json({ error: "This link is too old or was already used. Ask for a new one." }, 400);
  return json({ ok: true, redirect: resultPath(result) }, 200, resultCookies(result));
}
