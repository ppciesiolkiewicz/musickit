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

export type KeyChoice = { ok: true; key: string; own: boolean } | { ok: false; status: number; error: string };

/**
 * Which key pays for a call. A person's own key is used as given. The app's key from the environment is used only when
 * the server also has an access code and the caller sent it: without that, anyone who finds the page could spend the app's credit.
 */
export function chooseKey(args: { ownKey?: string | null; accessCode?: string | null; env: Record<string, string | undefined>; keyEnv: string }): KeyChoice {
  const own = args.ownKey?.trim();
  if (own) return { ok: true, key: own, own: true };
  const key = args.env[args.keyEnv]?.trim();
  const code = args.env.SAMPLER_ACCESS_CODE?.trim();
  if (!key || !code) return { ok: false, status: 403, error: "This site has no sample key set up. Use your own key." };
  if (!args.accessCode || !sameText(args.accessCode, code)) return { ok: false, status: 401, error: "Wrong access code." };
  return { ok: true, key, own: false };
}

/** Compares without stopping at the first difference. */
export function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** A sliding-window limiter: `limit` calls per `windowMs` for each caller. */
export function createLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    /** true if the call is allowed (and counted) */
    take(who: string): boolean {
      const t = now();
      const recent = (hits.get(who) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= limit) {
        hits.set(who, recent);
        return false;
      }
      recent.push(t);
      hits.set(who, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
      return true;
    },
  };
}
