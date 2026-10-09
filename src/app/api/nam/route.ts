import { del, list, put } from "@vercel/blob";
import { MAX_MODEL_BYTES, NAM_PREFIX, blobToken, checkAccess, libraryPath, ownPath } from "@/features/nam/server/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const gate = (req: Request) => checkAccess(process.env, req.headers.get("x-site-password"));

/** The models in the private library: name, size, date. */
export async function GET(req: Request) {
  const a = gate(req);
  if (!a.ok) return json({ error: a.error }, a.status);
  try {
    const res = await list({ prefix: NAM_PREFIX, token: blobToken(process.env) });
    const models = res.blobs
      .filter((b) => ownPath(b.pathname))
      .map((b) => ({ path: b.pathname, name: b.pathname.slice(NAM_PREFIX.length), size: b.size, uploadedAt: new Date(b.uploadedAt).getTime() }))
      .sort((x, y) => x.name.localeCompare(y.name));
    return json({ models });
  } catch {
    return json({ error: "The library could not be read." }, 502);
  }
}

/** Add a model: multipart form with a `file` field. */
export async function POST(req: Request) {
  const a = gate(req);
  if (!a.ok) return json({ error: a.error }, a.status);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file." }, 400);
  const path = libraryPath(file.name);
  if (!path) return json({ error: "Only .nam files." }, 400);
  if (file.size > MAX_MODEL_BYTES) return json({ error: "That model is over 4 MB, which is the upload limit." }, 413);
  try {
    await put(path, file, { access: "private", allowOverwrite: true, addRandomSuffix: false, token: blobToken(process.env) });
    return json({ path });
  } catch {
    return json({ error: "The upload failed." }, 502);
  }
}

export async function DELETE(req: Request) {
  const a = gate(req);
  if (!a.ok) return json({ error: a.error }, a.status);
  const path = ownPath(new URL(req.url).searchParams.get("path"));
  if (!path) return json({ error: "Unknown model." }, 400);
  try {
    await del(path, { token: blobToken(process.env) });
    return json({ ok: true });
  } catch {
    return json({ error: "Could not delete it." }, 502);
  }
}
