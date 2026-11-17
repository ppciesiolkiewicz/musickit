import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const EXAMPLES = "src/features/library/seed";

/** One seed file as git knows it: the last commit that touched it, and whether it has uncommitted edits. */
export interface ExampleFile {
  path: string;
  commit: string;
  dirty: boolean;
}

export interface Commits {
  /** the checkout's short HEAD */
  head: string;
  /** by seed file id (the file's name without .json) */
  files: Record<string, ExampleFile>;
}

const git = async (...args: string[]) => (await run("git", args, { cwd: process.cwd() })).stdout.trim();

/** HEAD and, for every seed plan and block file, its last commit and uncommitted state. */
export async function exampleCommits(): Promise<Commits> {
  const head = await git("rev-parse", "--short", "HEAD");
  const dirty = new Set((await git("status", "--porcelain", "--", EXAMPLES)).split("\n").filter(Boolean).map((l) => l.slice(3)));
  const files: Record<string, ExampleFile> = {};
  for (const dir of ["blocks", "plans"]) {
    const names = (await readdir(path.join(process.cwd(), EXAMPLES, dir))).filter((n) => n.endsWith(".json"));
    await Promise.all(names.map(async (n) => {
      const p = `${EXAMPLES}/${dir}/${n}`;
      files[n.slice(0, -5)] = { path: p, commit: (await git("log", "-1", "--format=%h", "--", p)) || "uncommitted", dirty: dirty.has(p) };
    }));
  }
  return { head, files };
}
