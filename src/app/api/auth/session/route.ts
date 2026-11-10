import { auth, json, requestAccount } from "@/features/account/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is signed in: { account } or { account: null }. Renews an ageing session, and clears the cookies of one that is gone. */
export async function GET(req: Request) {
  const deps = auth();
  if (!deps) return json({ account: null });
  const { account, cookies } = await requestAccount(deps, req);
  return json({ account }, 200, cookies);
}
