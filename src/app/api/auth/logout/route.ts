import { signOut } from "@/features/account/server/auth";
import { SESSION_COOKIE, auth, json, readCookie, sameOrigin, signOutCookies } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ends this browser's session. Always answers ok: signed out is signed out. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const deps = auth();
  if (deps) await signOut(deps, readCookie(req, SESSION_COOKIE));
  return json({ ok: true }, 200, signOutCookies());
}
