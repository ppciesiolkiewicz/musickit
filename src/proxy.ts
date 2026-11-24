import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath, loginHref } from "@/lib/publicPaths";
import { sharedNoteGone, sharedNoteId } from "@/lib/sharedNoteGone";
import { COUNTRY_HEADER, REGION_COOKIE, regionOf } from "@/lib/analyticsChoice";

/*
 * The login wall (docs/superpowers/specs/2026-11-14-autoplan-centre-design.md). Only checks that a session cookie is
 * there, never the database: a stale cookie gets through and the client guard (LoginGuard) sends that person to log in.
 * Nothing is gated on a site without accounts.
 *
 * It also notes whether this visitor is asked before their visits are counted (lib/analyticsChoice.ts): the host says
 * which country the request came from, and the cookie keeps only "ask" or "count", never the country.
 */

/** `SESSION_COOKIE` in features/account/server/http.ts; not imported, so the proxy doesn't pull in the database. */
const SESSION = "mk_session";

/** The response with the region cookie, set only when the host names a country and the cookie isn't already right. */
function withRegion(req: NextRequest, res: NextResponse): NextResponse {
  const country = req.headers.get(COUNTRY_HEADER);
  if (!country) return res;
  const region = regionOf(country);
  if (req.cookies.get(REGION_COOKIE)?.value !== region) res.cookies.set(REGION_COOKIE, region, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // a stopped or unknown note link answers 404 (see sharedNoteGone: a clear 404 only, 2 s at most, page loads only)
  const shared = sharedNoteId(pathname);
  if (shared && (await sharedNoteGone(req, shared))) return NextResponse.rewrite(req.nextUrl, { status: 404 });
  if (process.env.NEXT_PUBLIC_ACCOUNTS !== "on") return withRegion(req, NextResponse.next());
  const signedIn = req.cookies.has(SESSION);
  if (signedIn || isPublicPath(pathname)) return withRegion(req, NextResponse.next());
  return NextResponse.redirect(new URL(loginHref(pathname + search), req.url));
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|_vercel/|images/|instruments/|models/|videos/).*)"],
};
