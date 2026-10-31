import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { claudeArgs, parseClaudeResult, runClaude } from "./claude";

const dir = mkdtempSync(path.join(tmpdir(), "devtools-claude-"));
/** A stand-in for the claude binary: a bash script in a temp folder. */
function fake(name: string, body: string): string {
  const file = path.join(dir, name);
  writeFileSync(file, `#!/bin/bash\n${body}\n`);
  chmodSync(file, 0o755);
  return file;
}

test("claudeArgs: print mode, JSON, no tools, no MCP, no session, no user settings", () => {
  assert.deepEqual(claudeArgs({ model: "sonnet" }), [
    "-p", "--output-format", "json", "--model", "sonnet", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "project",
  ]);
  assert.deepEqual(claudeArgs({ model: "opus", effort: "high" }).slice(-2), ["--effort", "high"]);
});

test("parseClaudeResult reads the reply and its cost", () => {
  const out = JSON.stringify({ type: "result", is_error: false, result: "pong", total_cost_usd: 0.0141 });
  assert.deepEqual(parseClaudeResult(out, "", 0), { ok: true, text: "pong", costUsd: 0.0141 });
});

test("parseClaudeResult: an error result carries its message", () => {
  const out = JSON.stringify({ type: "result", is_error: true, result: "Not logged in" });
  assert.deepEqual(parseClaudeResult(out, "", 1), { ok: false, error: "Not logged in" });
});

test("parseClaudeResult: output that isn't JSON", () => {
  const r = parseClaudeResult("Welcome to Claude!", "", 0);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.error : "", /^Unexpected output: Welcome to Claude!/);
});

test("parseClaudeResult: a failed run with no output reports stderr", () => {
  assert.deepEqual(parseClaudeResult("", "boom\n", 1), { ok: false, error: "boom" });
  assert.deepEqual(parseClaudeResult("", "", 2), { ok: false, error: "claude exited with code 2" });
});

test("runClaude sends the prompt on stdin and returns the reply", async () => {
  // echoes the prompt back as the result, so the test sees stdin arrived
  const cmd = fake("ok.sh", `p=$(cat); printf '{"type":"result","is_error":false,"result":"%s","total_cost_usd":0.5}' "$p"`);
  const r = await runClaude("hello", { model: "haiku" }, undefined, cmd);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.text, "hello");
  assert.equal(r.ok && r.costUsd, 0.5);
  assert.ok(r.durationMs >= 0);
});

test("runClaude: cancelling kills the process", async () => {
  const pidFile = path.join(dir, "pid");
  const cmd = fake("slow.sh", `echo $$ > ${pidFile}; exec sleep 30`);
  const ac = new AbortController();
  // cancel once the script is surely running
  const poll = setInterval(() => existsSync(pidFile) && (clearInterval(poll), ac.abort()), 20);
  const r = await runClaude("x", { model: "haiku" }, ac.signal, cmd);
  assert.deepEqual({ ok: r.ok, error: !r.ok && r.error }, { ok: false, error: "cancelled" });
  assert.ok(r.durationMs < 5000);
  const pid = Number(readFileSync(pidFile, "utf8"));
  assert.throws(() => process.kill(pid, 0));
});

test("runClaude: an already aborted signal never leaves a process", async () => {
  const ac = new AbortController();
  ac.abort();
  const r = await runClaude("x", { model: "haiku" }, ac.signal, fake("never.sh", "exec sleep 30"));
  assert.equal(!r.ok && r.error, "cancelled");
});

test("runClaude: a missing binary says so", async () => {
  const r = await runClaude("x", { model: "haiku" }, undefined, "no-such-binary-xyz");
  assert.equal(!r.ok && r.error, "claude CLI not found on PATH");
});
