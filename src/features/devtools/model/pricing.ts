import type { TokenUsage } from "./history";
import type { DevModel } from "./models";

/**
 * US$ per million tokens, as if sent through an API. Claude: Anthropic's first-party list prices (2026-11). Local Ollama
 * models: what OpenRouter charges for the same open model (openrouter.ai/api/v1/models, 2026-11-15); a fine-tune is priced
 * as its base model. Thinking is billed as output.
 */
export const API_PRICES: Partial<Record<DevModel, { label: string; input: number; output: number }>> = {
  "claude-haiku-5-5": { label: "Haiku 5.5", input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { label: "Sonnet 5.5", input: 2, output: 10 },
  "claude-opus-5-5": { label: "Opus 5.5", input: 4, output: 20 },
  "claude-fable-5-2": { label: "Fable 5.2", input: 8, output: 40 },
  haiku: { label: "haiku", input: 0.1, output: 0.5 },
  sonnet: { label: "sonnet", input: 2, output: 10 },
  opus: { label: "opus", input: 4, output: 20 },
  "ollama:llama3.2:latest": { label: "Llama 3.2 3B", input: 0.0509, output: 0.335 },
  "ollama:llama3.1:8b": { label: "Llama 3.1 8B", input: 0.02, output: 0.04 },
  "ollama:huihui_ai/qwen3.5-abliterated:9b": { label: "Qwen 3.5 9B (abliterated)", input: 0.084, output: 0.123 },
};

/** Rough tokens in a text: four characters to a token. */
export const tokensOf = (chars: number): number => Math.ceil(chars / 4);

/** Thinking and the plan JSON both bill as output; thinking is taken as half again the reply. */
export const THINKING_FACTOR = 1.5;

export interface Estimate { inputTokens: number; outputTokens: number; usd: number }

/** What one run costs at API prices: the prompt as input, a reply of `replyChars` (plus thinking) as output. Null for an unpriced model. */
export function estimateCost(model: DevModel, promptChars: number, replyChars: number): Estimate | null {
  const p = API_PRICES[model];
  if (!p) return null;
  const inputTokens = tokensOf(promptChars);
  const outputTokens = Math.ceil(tokensOf(replyChars) * THINKING_FACTOR);
  return { inputTokens, outputTokens, usd: (inputTokens * p.input + outputTokens * p.output) / 1e6 };
}

export const usd = (x: number): string => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(3)}`);

/** What a run's tokens cost as one plain API call: every input token (cached or not) at the input price, output at the output price. */
export function apiCost(model: DevModel, u: TokenUsage): number | null {
  const p = API_PRICES[model];
  return p ? ((u.input + u.cacheRead + u.cacheWrite) * p.input + u.output * p.output) / 1e6 : null;
}
