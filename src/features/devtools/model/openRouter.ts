/**
 * Models on OpenRouter worth weighing against Haiku 5.5 for writing autoplans, for /admin/dev/costs. None of them has
 * been run on the plan prompt: a plan's cost is estimated from Haiku 5.5's measured tokens, so it is a price comparison,
 * not a quality one. Prices are OpenRouter's list prices, US$ per million tokens (openrouter.ai/api/v1/models,
 * checked `OPENROUTER_CHECKED`). Check the page before relying on one.
 */

export const OPENROUTER_CHECKED = "2026-11-15";

/**
 * Where a model could sit in the autoplan recipe. Before any AI, the request is matched against the seed library of
 * plans; then `assess`: a cheap call reads the request and the few library plans that matched, says whether one fits,
 * and if none does, which writer is needed; then the writer: `write` for most plans, `hard` for the ones the assess
 * call sends up. Our picks from price and what each model is, not from a run on our prompts.
 */
export type Role = "assess" | "write" | "hard";

export const ROLES: Record<Role, { label: string; about: string }> = {
  assess: { label: "Assess", about: "Reads the request and the library matches, answers in a few tokens: the cheapest input, reliable JSON, no long reasoning." },
  write: { label: "Write", about: "Writes most new plans: a long JSON reply, so the output price counts most." },
  hard: { label: "Hard plans", about: "For the plans the assess call sends up: dearer, worth it only for a few." },
};

export interface OpenRouterModel {
  /** OpenRouter's id, as sent in a request */
  id: string;
  label: string;
  input: number;
  output: number;
  /** what the model is, in a few words, from OpenRouter's description */
  about: string;
  /** a dearer price for the whole request once the prompt reaches `from` tokens */
  long?: { from: number; input: number; output: number };
  /** the steps of the recipe it suits, and why in a few words */
  fit?: { roles: Role[]; why: string };
}

/** US$ for one request of `input` and `output` tokens, at the long-prompt price when the prompt reaches it. */
export function openRouterCost(m: OpenRouterModel, input: number, output: number): number {
  const p = m.long && input >= m.long.from ? m.long : m;
  return (input * p.input + output * p.output) / 1e6;
}

/** Haiku 5.5 through OpenRouter first, as the line the others are measured against; then the rest, cheapest input first. */
export const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5", input: 0.1, output: 0.5, about: "what every plan uses today; the same price as Anthropic's own API", long: { from: 100_000, input: 0.5, output: 2.5 }, fit: { roles: ["assess", "write"], why: "the measured baseline: does both today" } },
  { id: "z-ai/glm-5.3-flash", label: "GLM-5.3 Flash", input: 0.04, output: 0.078, about: "Z.ai's small multimodal model, for coding and agent tasks", fit: { roles: ["assess"], why: "the cheapest input and output on the list, for a short yes or no" } },
  { id: "deepseek/deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash", input: 0.051, output: 0.203, about: "DeepSeek's fast mixture-of-experts model", fit: { roles: ["assess", "write"], why: "half Haiku's input price, cheap output for a whole plan" } },
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna", input: 0.1, output: 0.5, about: "OpenAI's fast, low-cost GPT-6 model", long: { from: 272_000, input: 0.2, output: 0.75 }, fit: { roles: ["assess", "write"], why: "Haiku's short-prompt price with no jump until 272k, strict JSON output: the safest swap to try first" } },
  { id: "meta/muse-ember", label: "Muse Ember", input: 0.1, output: 0.5, about: "Meta's smallest reasoning model, new in November 2026" },
  { id: "deepseek/deepseek-v4-pro-0813", label: "DeepSeek V4 Pro", input: 0.111, output: 4.44, about: "DeepSeek's large model: cheap to read, dear to write" },
  { id: "xiaomi/mimo-v2.6-flash", label: "MiMo-V2.6 Flash", input: 0.14, output: 0.28, about: "Xiaomi's open-source mixture-of-experts model" },
  { id: "qwen/qwen3.8-flash", label: "Qwen3.8 Flash", input: 0.15, output: 0.47, about: "Alibaba's fast multimodal reasoning model", fit: { roles: ["write"], why: "cheaper output than Haiku for a long plan" } },
  { id: "mistralai/mistral-small-2603", label: "Mistral Small 4", input: 0.15, output: 0.6, about: "Mistral's small general model" },
  { id: "minimax/minimax-m3.1-flash", label: "MiniMax-M3.1 Flash", input: 0.15, output: 0.6, about: "MiniMax's fast multimodal model" },
  { id: "openai/gpt-oss-120b", label: "gpt-oss-120b", input: 0.15, output: 0.6, about: "OpenAI's open-weight model, can also run on our own server", fit: { roles: ["write"], why: "cheap output, and could run on our own server later" } },
  { id: "google/gemma-4-31b-it", label: "Gemma 4 31B", input: 0.2, output: 0.4, about: "Google's open model, can also run on our own server", fit: { roles: ["assess"], why: "small and open: could run on our own server for every assess call" } },
  { id: "google/gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", input: 0.3, output: 2.5, about: "Google's low-cost Gemini" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", input: 0.825, output: 4.125, about: "Google's strongest Flash model: dearer, for comparison", fit: { roles: ["hard"], why: "a strong Flash model for the few plans sent up" } },
  { id: "openai/gpt-6.1-terra", label: "GPT-6.1 Terra", input: 1, output: 5, about: "OpenAI's mid-tier GPT-6.1: dearer, for comparison", long: { from: 272_000, input: 2, output: 7.5 }, fit: { roles: ["hard"], why: "OpenAI's mid tier, for the few plans sent up" } },
];

export const BASELINE_ID = OPENROUTER_MODELS[0].id;

export interface OpenRouterEstimate {
  model: OpenRouterModel;
  /** US$ for one autoplan of the reference tokens */
  perPlan: number;
  /** US$ a year at `plansPerMonth` */
  aiYear: number;
  /** perPlan ÷ the baseline's perPlan */
  vsBaseline: number;
}

/** Every model's cost for one autoplan of `ref` tokens (Haiku 5.5's measured median) and a year of them, cheapest first. */
export function estimateOpenRouter(ref: { input: number; output: number }, plansPerMonth: number, models: OpenRouterModel[] = OPENROUTER_MODELS): OpenRouterEstimate[] {
  const cost = (m: OpenRouterModel) => openRouterCost(m, ref.input, ref.output);
  const base = cost(models.find((m) => m.id === BASELINE_ID) ?? models[0]);
  return models
    .map((model) => {
      const perPlan = cost(model);
      return { model, perPlan, aiYear: perPlan * plansPerMonth * 12, vsBaseline: base > 0 ? perPlan / base : 1 };
    })
    .sort((a, b) => a.perPlan - b.perPlan);
}
