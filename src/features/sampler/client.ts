import type { Capabilities } from "./server/providers";

/** The dev route: it answers in development only. */
const URL = "/api/dev/sampler";

export async function fetchCapabilities(): Promise<Capabilities | null> {
  try {
    const res = await fetch(URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as Capabilities) : null;
  } catch {
    return null;
  }
}

/** Asks the server for a sample. Throws a short, showable message when it fails. */
export async function generateSample(o: { provider: string; prompt: string; seconds: number }): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o), signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new Error("Could not reach the server.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed (${res.status}).`);
  }
  return res.blob();
}
