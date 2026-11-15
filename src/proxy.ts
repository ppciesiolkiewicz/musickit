import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath, loginHref } from "@/lib/publicPaths";

/*
 * The login wall (docs/superpowers/specs/2026-11-14-autoplan-centre-design.md). Only checks that a session cookie is
 * there, never the database: a stale cookie gets through and the client guard (LoginGuard) sends that person to log in.
 * Nothing is gated on a site without accounts.
 */

/** `SESSION_COOKIE` in features/account/server/http.ts; not imported, so the proxy doesn't pull in the database. */
const SESSION = "mk_session";

/** The notes creator reads a shared note from the URL hash, which never reaches here: its login check is LoginGuard's. */
const CLIENT_GATED = "/teachers/studio";

export function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ACCOUNTS !== "on") return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  const signedIn = req.cookies.has(SESSION);
  if (signedIn || isPublicPath(pathname) || pathname === CLIENT_GATED) return NextResponse.next();
  return NextResponse.redirect(new URL(loginHref(pathname + search), req.url));
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|_vercel/|images/|instruments/|models/|videos/).*)"],
};
