import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { TokenUsage } from "../model/history";
import type { DevModel } from "../model/models";

export interface RunOptions { model: Exclude<DevModel, `ollama:${string}`>; effort?: "low" | "medium" | "high"; /** default 10 minutes */ timeoutMs?: number }
export type RunOutput = { ok: true; text: string; durationMs: number; costUsd?: number; usage?: TokenUsage } | { ok: false; error: string; durationMs: number };
type Parsed = { ok: true; text: string; costUsd?: number; usage?: TokenUsage } | { ok: false; error: string };

const count = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);
/** The tokens a run used, from the CLI's `usage`; none when it has no token counts. */
function usageOf(u: unknown): TokenUsage | undefined {
  if (!u || typeof u !== "object") return undefined;
  const r = u as Record<string, unknown>;
  if (typeof r.input_tokens !== "number" || typeof r.output_tokens !== "number") return undefined;
  return { input: count(r.input_tokens), output: count(r.output_tokens), cacheRead: count(r.cache_read_input_tokens), cacheWrite: count(r.cache_creation_input_tokens) };
}

const TIMEOUT_MS = 10 * 60_000;
/**
 * Room for a whole plan in one reply. At the CLI's default (32k on Haiku) a long plan runs over, the CLI carries on in a
 * second reply, and `result` holds only that last part: half a JSON, "not a plan".
 */
export const MAX_OUTPUT_TOKENS = "64000";
const minutes = (ms: number) => `${Math.round(ms / 60_000)} minutes`;

/**
 * One print-mode call that sees only the prompt, like a player's own AI: no tools, no MCP servers, no saved session, only
 * project settings, which are empty because it runs outside the repo (so no user hooks or CLAUDE.md reach it), and a plain
 * system prompt in place of Claude Code's (which brings auto-memory: the model then "reads its memory" instead of answering).
 * `--bare` would do this too but skips the keychain, so a logged-in CLI fails with "Not logged in".
 */
export function claudeArgs(o: RunOptions): string[] {
  return [
    "-p", "--output-format", "json", "--model", o.model, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "project",
    "--system-prompt", "You are a helpful assistant.",
    ...(o.effort ? ["--effort", o.effort] : []),
  ];
}

/** API credentials the CLI would prefer over the subscription login; a run must never bill the API. */
const API_CREDENTIALS = new Set(["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]);

/**
 * The environment for the child: without the variables of a Claude session the dev server may run inside, and without API
 * credentials, so the CLI always runs on the subscription login (which stays).
 */
export function childEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(env).filter(([k]) =>
    !API_CREDENTIALS.has(k) && (k === "CLAUDE_CODE_OAUTH_TOKEN" || !(k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_")))));
}

/** The CLI's JSON result as a reply or an error. */
export function parseClaudeResult(stdout: string, stderr: string, code: number | null): Parsed {
  const out = stdout.trim();
  if (!out) return { ok: false, error: stderr.trim() || `claude exited with code ${code}` };
  let r: { is_error?: unknown; result?: unknown; total_cost_usd?: unknown; usage?: unknown };
  try {
    r = JSON.parse(out);
  } catch {
    return { ok: false, error: `Unexpected output: ${out.slice(0, 300)}` };
  }
  const text = typeof r.result === "string" ? r.result : "";
  if (r.is_error || code) return { ok: false, error: text || stderr.trim() || `claude exited with code ${code}` };
  const usage = usageOf(r.usage);
  return { ok: true, text, ...(typeof r.total_cost_usd === "number" ? { costUsd: r.total_cost_usd } : {}), ...(usage ? { usage } : {}) };
}

/** Runs `prompt` through the local claude CLI. Aborting `signal` (or 10 minutes passing) kills the process. */
export function runClaude(prompt: string, o: RunOptions, signal?: AbortSignal, cmd = "claude"): Promise<RunOutput> {
  const t0 = Date.now();
  const done = (r: Parsed): RunOutput => ({ ...r, durationMs: Date.now() - t0 });
  if (signal?.aborted) return Promise.resolve(done({ ok: false, error: "cancelled" }));
  return new Promise((resolve) => {
    const child = spawn(cmd, claudeArgs(o), { cwd: tmpdir(), env: { ...childEnv(process.env), CLAUDE_CODE_MAX_OUTPUT_TOKENS: MAX_OUTPUT_TOKENS } as unknown as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stopped: string | null = null;
    const stop = (why: string) => {
      stopped = why;
      child.kill("SIGTERM");
    };
    const onAbort = () => stop("cancelled");
    const limit = o.timeoutMs ?? TIMEOUT_MS;
    const timer = setTimeout(() => stop(`timed out after ${minutes(limit)}`), limit);
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
