import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { checkEdit, keptRiff, riffBlockOf, riffInFile, riffsOf, type RiffBlock, type RiffEdit } from "@/features/devtools/riff/blocks";
import { devOnly } from "@/features/devtools/gate";
import { permissionCheck, permissionGate } from "@/features/devtools/server/access";
import { NO_ACCOUNTS } from "@/features/account/server/http";
import { SEED_BLOCKS, type SeedBlockFile } from "@/features/library/seed";
import { drizzleUserDataRepo } from "@/features/userData/server/repo.drizzle";
import type { RiffEditRow } from "@/features/userData/server/repo";
import { curatedBlocks } from "@/features/userData/server/seedBlocks";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The seed blocks' folder, from the repo root. */
const BLOCKS = "src/features/library/seed/blocks";
const fail = (error: string, status: number) => Response.json({ error }, { status });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * The seed block files that hold a riff. On a developer's machine they are read from disk, not the bundle, so a file
 * changed a moment ago (by `db:pull-riffs` or by hand) is the one that opens; in production, the bundled seed. A file
 * that can't be read or parsed is named by its file name in `unread`.
 */
async function riffFiles(): Promise<{ files: SeedBlockFile[]; unread: string[] }> {
  if (!devOnly()) return { files: SEED_BLOCKS.filter((f) => riffBlockOf(f) !== null), unread: [] };
  const names = (await readdir(path.join(process.cwd(), BLOCKS))).filter((f) => f.endsWith(".json")).sort();
  const files: SeedBlockFile[] = [];
  const unread: string[] = [];
  await Promise.all(names.map(async (name) => {
    try {
      const text = await readFile(path.join(process.cwd(), BLOCKS, name), "utf8");
      if (text.includes('"riff"')) files.push(JSON.parse(text) as SeedBlockFile);
    } catch (e) {
      unread.push(`${name}: ${message(e)}`);
    }
  }));
  return { files, unread };
}

/** The file with its saved edit laid over it, when there is one and it reads. */
const shown = (file: SeedBlockFile, e: RiffEditRow | undefined): SeedBlockFile => (e && keptRiff(file, e.edit)) || file;

/**
 * The riffs for the riff maker (/admin/content/riff): each seed block's riff, or the one saved in the app over it
 * (`blocks.riff_edit`), with `edited`. `saving` is false when the site has no database (riffs can't be saved then).
 */
export async function GET(req: Request) {
  const gate = await permissionGate(req, ["dev", "content"]);
  if (gate) return gate;
  try {
    const { files, unread } = await riffFiles();
    const db = getDb();
    const edits = new Map((db ? await drizzleUserDataRepo(db).riffEdits() : []).map((e) => [e.blockId, e]));
    const out = riffsOf(files.map((f) => shown(f, edits.get(f.id))));
    const riffs: RiffBlock[] = out.riffs.map((r) => {
      const f = files.find((x) => x.id === r.id);
      const e = f && edits.get(f.id);
      const k = f && e ? keptRiff(f, e.edit) : null;
      return k && e ? { ...r, edited: { at: e.at.toISOString(), by: e.byName, inFile: riffInFile(f, e.edit) } } : r;
    });
    return Response.json({ riffs, problems: [...unread, ...out.problems].sort(), saving: db !== null }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(`The riffs couldn't be loaded: ${message(e)}`, 500);
  }
}

/**
 * Save a riff into its block in the database: `{ id, tonic, scale, bpm, notes, amp? }`. Players get it in plans made
 * from now on. Only a curated block whose seed file holds a riff; its words, genre and choices stay the file's
 * (`withRiff`), its content and its choices' tempo ranges take the riff (`curatedBlocks`, as the seed would store it).
 * Nothing is written when the edit doesn't pass `checkEdit`. The seed file is left; `npm run db:pull-riffs` writes it.
 */
export async function PUT(req: Request) {
  const gate = await permissionCheck(req, "content");
  if (!gate.ok) return gate.response;
  if (!gate.account) return fail("Log in to save a riff.", 401);
  const db = getDb();
  if (!db) return fail(NO_ACCOUNTS, 503);
  const body = (await req.json().catch(() => null)) as (Record<string, unknown> & Partial<RiffEdit>) | null;
  const id = typeof body?.id === "string" && /^[a-z0-9-]+$/.test(body.id) ? body.id : null;
  if (!body || !id) return fail("No riff was named, so nothing was saved.", 400);
  const wrong = checkEdit(body);
  if (wrong.length) return fail(`Not saved: ${wrong.join("; ")}.`, 400);
  let file: SeedBlockFile | undefined;
  try {
    file = (await riffFiles()).files.find((f) => f.id === id);
  } catch (e) {
    return fail(`The riffs couldn't be read, so nothing was saved: ${message(e)}`, 500);
  }
  if (!file) return fail(`No exercise "${id}" holds a riff, so nothing was saved.`, 404);
  const edit: RiffEdit = { tonic: body.tonic!, scale: body.scale!, bpm: body.bpm!, notes: body.notes!, ...(body.amp !== undefined ? { amp: body.amp } : {}) };
  const next = keptRiff(file, edit);
  const riff = next && riffBlockOf(next);
  const { blocks } = next ? curatedBlocks([next]) : { blocks: [] };
  if (!next || !riff || "error" in riff || !blocks[0]) return fail(`The riff of "${id}" couldn't be written into its exercise, so nothing was saved.`, 400);
  const b = blocks[0];
  const now = new Date();
  try {
    const saved = await drizzleUserDataRepo(db).saveRiff({ id, content: b.content, moves: b.choices.map((c) => ({ id: c.id, moves: c.moves })) }, edit, gate.account.id, now);
    if (!saved) return fail(`"${id}" isn't in the library database yet. Run npm run db:seed-blocks, then save again.`, 404);
  } catch (e) {
    return fail(`The riff couldn't be saved: ${message(e)}`, 500);
  }
  return Response.json({ riff: { ...riff, edited: { at: now.toISOString(), by: gate.account.name, inFile: riffInFile(file, edit) } } });
}
