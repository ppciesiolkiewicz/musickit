import { createHash } from "node:crypto";
import type { GoogleProfile } from "./auth";

/** "Continue with Google": the OAuth code flow with PKCE, by hand (two requests, no library). */

type Env = Record<string, string | undefined>;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

/** Google's keys, or null when they are not set: then the Google button is not shown. */
export function googleConfig(env: Env = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const googleRedirectUri = (base: string): string => `${base}/api/auth/google/callback`;

export const pkceChallenge = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

/** Where the browser is sent to sign in at Google. */
export function googleAuthUrl(config: GoogleConfig, opts: { redirectUri: string; state: string; verifier: string }): string {
  const q = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: pkceChallenge(opts.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * The person in a Google ID token, or null when the token is not for us or has expired. The signature is not checked:
 * the token is only ever read straight from Google's token endpoint over HTTPS, which is what vouches for it.
 * Never pass this a token that came from a browser.
 */
export function profileFromIdToken(idToken: unknown, clientId: string, now: Date): GoogleProfile | null {
  if (typeof idToken !== "string") return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (!ISSUERS.includes(c.iss as string) || c.aud !== clientId) return null;
    if (typeof c.exp !== "number" || c.exp * 1000 <= now.getTime()) return null;
    if (typeof c.sub !== "string" || !c.sub || typeof c.email !== "string") return null;
    return { sub: c.sub, email: c.email, emailVerified: c.email_verified === true || c.email_verified === "true", name: typeof c.name === "string" ? c.name : "" };
  } catch {
    return null;
  }
}

/** Swaps the code Google sent back for the person's profile. Null when Google refuses it. */
export async function googleProfile(config: GoogleConfig, opts: { code: string; verifier: string; redirectUri: string }, now: Date, fetcher: typeof fetch = fetch): Promise<GoogleProfile | null> {
  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      code_verifier: opts.verifier,
      redirect_uri: opts.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  return profileFromIdToken(body?.id_token, config.clientId, now);
}
