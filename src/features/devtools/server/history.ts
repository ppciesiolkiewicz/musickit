import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DOC_VERSIONS } from "@/features/plan/examples";
import { PROMPT_VERSION } from "@/features/plan/model/prompt";
import { RUN_ID, summaryOf, type RunRecord, type RunSummary, type RunVersions } from "../model/history";

/** Where runs are kept: tools/prompt-history at the repo root (gitignored). */
export const HISTORY_DIR = path.join(process.cwd(), "tools/prompt-history");

/** The versions in the code now, which a run saved now was written to. */
export const currentVersions = (): RunVersions => ({ prompt: PROMPT_VERSION, agents: DOC_VERSIONS.agents, teaching: DOC_VERSIONS.teaching });

/** Writes the run, stamped with the versions in the code now unless it carries its own. */
export async function saveRun(r: RunRecord, dir = HISTORY_DIR): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${r.id}.json`), JSON.stringify({ ...r, versions: r.versions ?? currentVersions() }, null, 2) + "\n");
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
