import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { DevModel } from "../model/models";

export interface RunOptions { model: DevModel; effort?: "low" | "medium" | "high" }
export type RunOutput = { ok: true; text: string; durationMs: number; costUsd?: number } | { ok: false; error: string; durationMs: number };
type Parsed = { ok: true; text: string; costUsd?: number } | { ok: false; error: string };

const TIMEOUT_MS = 10 * 60_000;

/**
 * One print-mode call that sees only the prompt, like a player's own AI: no tools, no MCP servers, no saved session, and
 * only project settings, which are empty because it runs outside the repo (so no user hooks or CLAUDE.md reach it).
 */
export function claudeArgs(o: RunOptions): string[] {
  return [
    "-p", "--output-format", "json", "--model", o.model, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "project",
    ...(o.effort ? ["--effort", o.effort] : []),
  ];
}

/** The CLI's JSON result as a reply or an error. */
export function parseClaudeResult(stdout: string, stderr: string, code: number | null): Parsed {
  const out = stdout.trim();
  if (!out) return { ok: false, error: stderr.trim() || `claude exited with code ${code}` };
  let r: { is_error?: unknown; result?: unknown; total_cost_usd?: unknown };
  try {
    r = JSON.parse(out);
  } catch {
    return { ok: false, error: `Unexpected output: ${out.slice(0, 300)}` };
  }
  const text = typeof r.result === "string" ? r.result : "";
  if (r.is_error || code) return { ok: false, error: text || stderr.trim() || `claude exited with code ${code}` };
  return { ok: true, text, ...(typeof r.total_cost_usd === "number" ? { costUsd: r.total_cost_usd } : {}) };
}

/** Runs `prompt` through the local claude CLI. Aborting `signal` (or 10 minutes passing) kills the process. */
export function runClaude(prompt: string, o: RunOptions, signal?: AbortSignal, cmd = "claude"): Promise<RunOutput> {
  const t0 = Date.now();
  const done = (r: Parsed): RunOutput => ({ ...r, durationMs: Date.now() - t0 });
  if (signal?.aborted) return Promise.resolve(done({ ok: false, error: "cancelled" }));
  return new Promise((resolve) => {
    const child = spawn(cmd, claudeArgs(o), { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stopped: string | null = null;
    const stop = (why: string) => {
      stopped = why;
      child.kill("SIGTERM");
    };
    const onAbort = () => stop("cancelled");
    const timer = setTimeout(() => stop("timed out after 10 minutes"), TIMEOUT_MS);
    signal?.addEventListener("abort", onAbort, { once: true });
    const finish = (r: Parsed) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(done(r));
    };
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    // the child may exit before reading all of stdin; its exit code tells the story
    child.stdin.on("error", () => {});
    child.on("error", (e: NodeJS.ErrnoException) => finish({ ok: false, error: e.code === "ENOENT" ? "claude CLI not found on PATH" : e.message }));
    child.on("close", (code) => finish(stopped ? { ok: false, error: stopped } : parseClaudeResult(stdout, stderr, code)));
    child.stdin.end(prompt);
  });
}
