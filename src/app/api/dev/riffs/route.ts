import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { blockFileText, checkEdit, riffBlockOf, riffsOf, withRiff, type RiffBlock, type RiffEdit } from "@/features/devtools/riff/blocks";
import { devGate, devOnly } from "@/features/devtools/gate";
import { permissionGate } from "@/features/devtools/server/access";
import { SEED_BLOCKS } from "@/features/library/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The seed blocks' folder, from the repo root. */
const BLOCKS = "src/features/library/seed/blocks";
const fileOf = (id: string) => path.join(process.cwd(), BLOCKS, `${id}.json`);
const fail = (error: string, status: number) => Response.json({ error }, { status });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The seed blocks that hold a riff, as their files are now. One whose riff can't be read is left out and named in `problems`. */
async function readRiffs(): Promise<{ riffs: RiffBlock[]; problems: string[] }> {
  const names = (await readdir(path.join(process.cwd(), BLOCKS))).filter((f) => f.endsWith(".json")).sort();
  const riffs: RiffBlock[] = [];
  const problems: string[] = [];
  await Promise.all(names.map(async (name) => {
    try {
      const text = await readFile(path.join(process.cwd(), BLOCKS, name), "utf8");
      if (!text.includes('"riff"')) return;
      const r = riffBlockOf(JSON.parse(text));
      if (r && "error" in r) problems.push(`${name}: ${r.error}`); else if (r) riffs.push(r);
    } catch (e) {
      problems.push(`${name}: ${message(e)}`);
    }
  }));
  return { riffs: riffs.sort((a, b) => a.id.localeCompare(b.id)), problems: problems.sort() };
}

/**
 * The riffs of the seed blocks for the riff maker (/admin/content/riff), read from the files and not from the bundle, so a riff saved
 * a moment ago is the one that opens. Only on a developer's machine: PUT writes into the checkout. In production GET answers from the bundled seed (`fromBundle`) and PUT is a 404.
 */
export async function GET(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  // a production build has no checkout to read: the riffs of the bundled seed (interim, until riffs are saved to the database)
  if (!devOnly()) return Response.json({ ...riffsOf(SEED_BLOCKS), fromBundle: true }, { headers: { "cache-control": "no-store" } });
  try {
    return Response.json(await readRiffs(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(`The seed blocks could not be read: ${message(e)}`, 500);
  }
}

/**
 * Save a riff into its block's file: `{ id, tonic, scale, bpm, notes }`. Only a block that already holds a riff; its words,
 * genre and choices stay as the file has them (`withRiff`). Nothing is written when the edit doesn't pass `checkEdit`.
 */
export async function PUT(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const body = (await req.json().catch(() => null)) as (Record<string, unknown> & Partial<RiffEdit>) | null;
  const id = typeof body?.id === "string" && /^[a-z0-9-]+$/.test(body.id) ? body.id : null;
  if (!body || !id) return fail("No block id.", 400);
  let stored: unknown;
  try {
    stored = JSON.parse(await readFile(fileOf(id), "utf8"));
  } catch {
    return fail(`No seed block "${id}".`, 404);
  }
  const wrong = checkEdit(body);
  if (wrong.length) return fail(`Not saved: ${wrong.join("; ")}.`, 400);
  const next = withRiff(stored, body as RiffEdit);
  const riff = next && riffBlockOf(next);
  if (!next || !riff || "error" in riff) return fail(`The seed block "${id}" holds no riff.`, 400);
  try {
    await writeFile(fileOf(id), blockFileText(next));
  } catch (e) {
    return fail(`The file could not be written: ${message(e)}`, 500);
  }
  return Response.json({ riff });
}
