import { timingSafeEqual } from "node:crypto";
import { googleSignIn } from "@/features/account/server/auth";
import { googleConfig, googleProfile, googleRedirectUri } from "@/features/account/server/google";
import { OAUTH_COOKIE, auth, baseUrl, clearCookie, readCookie, redirect, resultCookies, resultPath } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google sends the browser back here with a code. Any failure returns to /login with a reason it can show. */
export async function GET(req: Request) {
  const base = baseUrl(req);
  const done = [clearCookie(OAUTH_COOKIE)];
  const fail = (reason: string) => redirect(`${base}/login?error=${reason}`, done);

  const deps = auth();
  const config = googleConfig();
  if (!deps || !config) return fail("google-off");

  const q = new URL(req.url).searchParams;
  const code = q.get("code");
  const state = q.get("state");
  let kept: { state?: unknown; verifier?: unknown; next?: unknown };
  try {
    kept = JSON.parse(readCookie(req, OAUTH_COOKIE) ?? "") as typeof kept;
  } catch {
    return fail("google");
  }
  // no code: the person pressed Cancel at Google
  if (!code) return fail(q.get("error") === "access_denied" ? "google-cancelled" : "google");
  if (!state || typeof kept.state !== "string" || typeof kept.verifier !== "string" || !same(state, kept.state)) return fail("google");

  try {
    const profile = await googleProfile(config, { code, verifier: kept.verifier, redirectUri: googleRedirectUri(base) }, deps.now());
    if (!profile) return fail("google");
    const result = await googleSignIn(deps, profile, { next: kept.next, userAgent: req.headers.get("user-agent") });
    if (!result) return fail("google-unverified");
    return redirect(`${base}${resultPath(result)}`, [...done, ...resultCookies(result)]);
  } catch {
    return fail("google");
  }
}
