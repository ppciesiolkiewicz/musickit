import { openEmailCode } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, json, readJson, resultCookies, resultPath, sameOrigin } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The code field on /login: spends the email's newest matching code, like the link's Continue button. JSON
 * { email, code }. Answers { ok, redirect } with the session cookie set, or with the ticket cookie and the account
 * setup's address when the email has no account yet.
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400);
  const result = await openEmailCode(deps, { email: body.email, code: body.code }, req.headers.get("user-agent"));
  if (!result) return json({ error: "That code didn't work. Check the code in the newest email, or send a new one.", field: "code" }, 400);
  return json({ ok: true, redirect: resultPath(result) }, 200, resultCookies(result));
}
