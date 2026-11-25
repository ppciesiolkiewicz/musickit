import { getProvider, type ProviderInfo } from "./providers";

export const MAX_PROMPT = 300;

export interface GenerateRequest {
  provider: ProviderInfo;
  prompt: string;
  seconds: number;
}

/** Checks the body of a generate call. Returns the cleaned request or an error message. */
export function parseGenerate(body: unknown): GenerateRequest | string {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const provider = getProvider(b.provider);
  if (!provider) return "Unknown provider.";
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  if (!prompt) return "Describe the sound.";
  if (prompt.length > MAX_PROMPT) return `The description is limited to ${MAX_PROMPT} characters.`;
  const seconds = typeof b.seconds === "number" && Number.isFinite(b.seconds) ? b.seconds : 4;
  return { provider, prompt, seconds: Math.min(provider.maxSeconds, Math.max(provider.minSeconds, seconds)) };
}

/** The app's key for a provider, from the environment, or a message saying it is not set. */
export function serverKey(env: Record<string, string | undefined>, keyEnv: string): { ok: true; key: string } | { ok: false; error: string } {
  const key = env[keyEnv]?.trim();
  return key ? { ok: true, key } : { ok: false, error: `${keyEnv} is not set on this server.` };
}
