import { get } from "@vercel/blob";
import { blobToken, checkAccess, ownPath } from "@/features/nam/server/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One model's file, read from the private store (password only if NAM_LIBRARY_PASSWORD is set). */
export async function GET(req: Request) {
  const a = checkAccess(process.env, req.headers.get("x-site-password"));
  if (!a.ok) return Response.json({ error: a.error }, { status: a.status });
  const path = ownPath(new URL(req.url).searchParams.get("path"));
  if (!path) return Response.json({ error: "Unknown model." }, { status: 400 });
  try {
    const res = await get(path, { access: "private", token: blobToken(process.env) });
    if (!res || res.statusCode !== 200) return Response.json({ error: "Not found." }, { status: 404 });
    return new Response(res.stream, { headers: { "content-type": "application/json", "x-content-type-options": "nosniff", "cache-control": "private, no-store" } });
  } catch {
    return Response.json({ error: "The model could not be read." }, { status: 502 });
  }
}
