import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Assessment } from "../model/assess";
import { RUN_ID } from "../model/history";
import { HISTORY_DIR } from "./history";

/** Where assessments are kept: one file per judged run, beside the runs (a folder, so `listRuns` passes it by). */
export const ASSESSMENTS_DIR = path.join(HISTORY_DIR, "assessments");

/** Keeps an assessment under the judged run's id; a newer one for the same run takes its place. */
export async function saveAssessment(a: Assessment, dir = ASSESSMENTS_DIR): Promise<void> {
  if (!RUN_ID.test(a.candidateId)) throw new Error(`Not a run id: ${a.candidateId}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${a.candidateId}.json`), JSON.stringify(a, null, 2) + "\n");
}

/** Every assessment; unreadable files are skipped. */
export async function listAssessments(dir = ASSESSMENTS_DIR): Promise<Assessment[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const all = await Promise.all(files.filter((f) => f.endsWith(".json")).sort().map(async (f) => {
    try {
      return JSON.parse(await readFile(path.join(dir, f), "utf8")) as Assessment;
    } catch {
      return null;
    }
  }));
  return all.flatMap((a) => (a ? [a] : []));
}
