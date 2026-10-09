import type { Capabilities } from "./server/providers";

export async function fetchCapabilities(): Promise<Capabilities | null> {
  try {
    const res = await fetch("/api/sampler/generate", { cache: "no-store" });
    return res.ok ? ((await res.json()) as Capabilities) : null;
  } catch {
    return null;
  }
}

export interface GenerateOptions {
  provider: string;
  prompt: string;
  seconds: number;
  /** the site's access code, when the site's own key is used */
  accessCode?: string;
  /** a person's own provider key; sent only to this site's server, which forwards it to the provider and does not keep it */
  ownKey?: string;
}

/** Asks the server for a sample. Throws a short, showable message when it fails. */
export async function generateSample(o: GenerateOptions): Promise<Blob> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.accessCode) headers["x-access-code"] = o.accessCode;
  if (o.ownKey) headers["x-provider-key"] = o.ownKey;
  let res: Response;
  try {
    res = await fetch("/api/sampler/generate", { method: "POST", headers, body: JSON.stringify({ provider: o.provider, prompt: o.prompt, seconds: o.seconds }) });
  } catch {
    throw new Error("Could not reach the server.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed (${res.status}).`);
  }
  return res.blob();
}
