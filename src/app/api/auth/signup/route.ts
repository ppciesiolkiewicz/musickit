import { finishSignup, pendingSignup, type FinishError } from "@/features/account/server/auth";
import { NO_ACCOUNTS, SIGNUP_COOKIE, auth, clearCookie, json, readCookie, readJson, resultCookies, sameOrigin } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERRORS: Record<FinishError, string> = {
  expired: "This took too long, so we have to check your email again. Go back to Log in.",
  name: "Type your name.",
};

/** The account setup's start: the email that was proven (by a link or Google) and a name to offer. 404 when there is no ticket. */
export async function GET(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  const pending = await pendingSignup(deps, readCookie(req, SIGNUP_COOKIE));
  return pending ? json(pending) : json({ error: ERRORS.expired }, 404, [clearCookie(SIGNUP_COOKIE)]);
}

/** The account setup: JSON { name }. Makes the account for the proven email and signs in. */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await readJson(req);
  const result = await finishSignup(deps, readCookie(req, SIGNUP_COOKIE), { name: body?.name }, req.headers.get("user-agent"));
  if (result.kind === "error") return json({ error: ERRORS[result.error], field: result.error }, result.error === "expired" ? 410 : 400);
  return json({ ok: true, redirect: result.next, account: result.account }, 200, resultCookies(result));
}
