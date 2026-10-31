import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { RUN_ID, summaryOf, type RunRecord, type RunSummary } from "../model/history";

/** Where runs are kept: tools/prompt-history at the repo root (gitignored). */
export const HISTORY_DIR = path.join(process.cwd(), "tools/prompt-history");

export async function saveRun(r: RunRecord, dir = HISTORY_DIR): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${r.id}.json`), JSON.stringify(r, null, 2) + "\n");
}

/** One run, or null when the id isn't a run id or there is no such file. */
export async function readRun(id: string, dir = HISTORY_DIR): Promise<RunRecord | null> {
  if (!RUN_ID.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(dir, `${id}.json`), "utf8")) as RunRecord;
  } catch {
    return null;
  }
}

/** Every run, newest first; unreadable files are skipped. */
export async function listRuns(dir = HISTORY_DIR): Promise<RunSummary[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const ids = files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort().reverse();
  const runs = await Promise.all(ids.map((id) => readRun(id, dir)));
  return runs.flatMap((r) => (r ? [summaryOf(r)] : []));
}
