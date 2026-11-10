import { newToken, safeNext } from "@/features/account/server/auth";
import { googleAuthUrl, googleConfig, googleRedirectUri } from "@/features/account/server/google";
import { OAUTH_COOKIE, auth, baseUrl, cookie, redirect } from "@/features/account/server/http";
import { isSignupRole } from "@/features/account/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Continue with Google": sends the browser to Google. `?role=` (from the register form) and `?next=` ride along in
 * a ten-minute cookie with the state and the PKCE secret, and are read back in the callback.
 */
export async function GET(req: Request) {
  const base = baseUrl(req);
  const config = googleConfig();
  if (!auth() || !config) return redirect(`${base}/login?error=google-off`);

  const q = new URL(req.url).searchParams;
  const role = q.get("role");
  const state = newToken();
  const verifier = newToken();
  const kept = JSON.stringify({ state, verifier, role: isSignupRole(role) ? role : null, next: safeNext(q.get("next")) });
  return redirect(googleAuthUrl(config, { redirectUri: googleRedirectUri(base), state, verifier }), [
    cookie(OAUTH_COOKIE, kept, { expires: new Date(Date.now() + 10 * 60_000) }),
  ]);
}
