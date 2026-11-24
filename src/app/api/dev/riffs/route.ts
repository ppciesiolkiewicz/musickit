import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkRiff, riffFileText, type BookRiff } from "@/features/exercises/riffs/book";
import { devGate } from "@/features/devtools/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The riff book's folder, from the repo root. */
const BOOK = "src/features/exercises/riffs/book";
const fileOf = (id: string) => path.join(process.cwd(), BOOK, `${id}.json`);
const fail = (error: string, status: number) => Response.json({ error }, { status });

/** The riffs as they are on disk now, by file name. A file that can't be read as a riff is left out and named in `problems`. */
async function readBook(): Promise<{ riffs: BookRiff[]; problems: string[] }> {
  const names = (await readdir(path.join(process.cwd(), BOOK))).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  const riffs: BookRiff[] = [];
  const problems: string[] = [];
  for (const id of names) {
    try {
      const raw = JSON.parse(await readFile(fileOf(id), "utf8")) as unknown;
      const wrong = checkRiff(raw, id);
      if (wrong.length) problems.push(`${id}: ${wrong.join("; ")}`); else riffs.push(raw as BookRiff);
    } catch (e) {
      problems.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { riffs, problems };
}

/**
 * The riff book for the riff maker (/dev/riff), read from the files and not from the bundle, so a riff saved a moment ago is
 * the one that opens. Only on a developer's machine: it writes into the checkout.
 */
export async function GET() {
  const gate = devGate();
  if (gate) return gate;
  try {
    return Response.json(await readBook(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(`The riff book could not be read: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

/**
 * Save a riff into its file: `{ id, tonic, scale, bpm, pos, notes }`. Only a riff the book already has; its name, genre and
 * steps stay as the file has them. Nothing is written when the riff doesn't pass `checkRiff`.
 */
export async function PUT(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" && /^[a-z0-9-]+$/.test(body.id) ? body.id : null;
  if (!body || !id) return fail("No riff id.", 400);
  let stored: BookRiff;
  try {
    stored = JSON.parse(await readFile(fileOf(id), "utf8")) as BookRiff;
  } catch {
    return fail(`The riff book has no riff "${id}".`, 404);
  }
  const next = { ...stored, tonic: body.tonic, scale: body.scale, bpm: body.bpm, pos: body.pos, notes: body.notes } as BookRiff;
  const wrong = checkRiff(next, id);
  if (wrong.length) return fail(`Not saved: ${wrong.join("; ")}.`, 400);
  try {
    await writeFile(fileOf(id), riffFileText(next));
  } catch (e) {
    return fail(`The file could not be written: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
  return Response.json({ riff: next });
}
