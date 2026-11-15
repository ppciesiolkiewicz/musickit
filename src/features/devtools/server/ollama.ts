import http from "node:http";
import type { TokenUsage } from "../model/history";
import { ollamaName, type OllamaModel } from "../model/models";
import type { RunOutput } from "./claude";

/** The local Ollama server (OLLAMA_HOST, as the ollama CLI reads it). */
const HOST = (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
/** A local model on a 40k-token prompt is slow; it gets longer than a Claude run. */
const TIMEOUT_MS = 30 * 60_000;

/** The models the local Ollama has; [] when it isn't running. */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const body = (await res.json()) as { models?: { name?: unknown }[] };
    return (body.models ?? []).flatMap((m) => (typeof m.name === "string" ? [`ollama:${m.name}` as OllamaModel] : []));
  } catch {
    return [];
  }
}

/**
 * Room for the prompt and a plan: Ollama's default context (a few thousand tokens) would cut the 40k-token prompt off
 * silently. As tight as is safe, since the context's cache is what fills the memory: the prompt at four characters a token
 * plus a tenth, and 12k for the reply, rounded up to 4k, at most 128k.
 */
export function contextFor(promptChars: number): number {
  const need = Math.ceil((promptChars / 4) * 1.1) + 12_288;
  return Math.min(131_072, Math.ceil(need / 4096) * 4096);
}

/**
 * One chat call to the local Ollama with only the prompt, like a player's own AI. Through node:http, not fetch: Ollama sends
 * its headers only once it has read the prompt, which on a 40k-token prompt can take longer than the five minutes fetch
 * waits for them. Only our own TIMEOUT_MS (or `signal`) stops it.
 */
export function runOllama(prompt: string, model: OllamaModel, signal?: AbortSignal): Promise<RunOutput> {
  const t0 = Date.now();
  const done = (r: { ok: true; text: string; usage?: TokenUsage } | { ok: false; error: string }): RunOutput => ({ ...r, durationMs: Date.now() - t0 });
  const body = JSON.stringify({ model: ollamaName(model), messages: [{ role: "user", content: prompt }], stream: true, options: { num_ctx: contextFor(prompt.length) } });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: Parameters<typeof done>[0]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(done(r));
    };
    const req = http.request(`${HOST}/api/chat`, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d: string) => (text += d));
      res.on("end", () => {
        if ((res.statusCode ?? 500) >= 400) {
          let error = `Ollama HTTP ${res.statusCode}`;
          try {
            const e = (JSON.parse(text) as { error?: unknown }).error;
            if (typeof e === "string") error = e;
          } catch {}
          return finish({ ok: false, error });
        }
        finish(readChatStream(text));
      });
      res.on("error", (e) => finish({ ok: false, error: `Ollama stream broke: ${e.message}` }));
    });
    const stop = (error: string) => {
      finish({ ok: false, error });
      req.destroy();
    };
    const onAbort = () => stop("cancelled");
    const timer = setTimeout(() => stop("timed out after 30 minutes"), TIMEOUT_MS);
    if (signal?.aborted) return stop("cancelled");
    signal?.addEventListener("abort", onAbort, { once: true });
    req.on("error", (e) => finish({ ok: false, error: `Ollama not reachable at ${HOST}: ${e.message}` }));
    req.end(body);
  });
}

/** Ollama's streamed chat (one JSON object a line) as the reply and its token counts, from the last line; or its error. */
export function readChatStream(ndjson: string): { ok: true; text: string; usage: TokenUsage } | { ok: false; error: string } {
  let text = "";
  const usage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const line of ndjson.split("\n")) {
    if (!line.trim()) continue;
    let m: { error?: unknown; message?: { content?: unknown }; done?: unknown; prompt_eval_count?: unknown; eval_count?: unknown };
    try {
      m = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof m.error === "string") return { ok: false, error: m.error };
    if (typeof m.message?.content === "string") text += m.message.content;
    if (m.done === true) {
      usage.input = typeof m.prompt_eval_count === "number" ? m.prompt_eval_count : 0;
      usage.output = typeof m.eval_count === "number" ? m.eval_count : 0;
    }
  }
  return { ok: true, text, usage };
}
