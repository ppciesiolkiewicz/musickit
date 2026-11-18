import { NO_ACCOUNTS, auth, json } from "@/features/account/server/http";
import { drizzleLibraryRepo } from "@/features/library/server/repo.drizzle";
import { composeRoute } from "@/features/plan/server/composeRoute";
import { signedIn, userData } from "@/features/userData/server/http";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Today's plan (`composeRoute`): JSON { date, another }. A teacher's student is refused with 409 `taught`. */
export async function POST(req: Request) {
  const a = auth();
  const store = userData();
  const db = getDb();
  if (!a || !store || !db) {
    // the session first, as before: signed out is 401 even on a site without the library
    const me = await signedIn(req);
    return me instanceof Response ? me : json({ error: NO_ACCOUNTS }, 503, me.cookies);
  }
  return composeRoute({ auth: a, userData: store.repo, library: drizzleLibraryRepo(db) }, req);
}
