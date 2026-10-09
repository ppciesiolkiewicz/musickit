/** ElevenLabs sound generation. Server only: the key is passed in and never returned. */
export const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/sound-generation";

export interface GenerateArgs {
  apiKey: string;
  prompt: string;
  seconds: number;
  fetchImpl?: typeof fetch;
}

export type GenerateResult = { ok: true; audio: ArrayBuffer; mime: string } | { ok: false; status: number; error: string };

export function buildBody(prompt: string, seconds: number) {
  return { text: prompt, duration_seconds: seconds, prompt_influence: 0.5 };
}

export async function generateSoundEffect({ apiKey, prompt, seconds, fetchImpl = fetch }: GenerateArgs): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetchImpl(ELEVENLABS_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify(buildBody(prompt, seconds)),
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach ElevenLabs." };
  }
  if (!res.ok) {
    // never forward the provider's body: it can echo request details
    const error = res.status === 401 || res.status === 403 ? "ElevenLabs refused the key." : res.status === 429 ? "ElevenLabs is rate limiting. Try again shortly." : `ElevenLabs error (${res.status}).`;
    return { ok: false, status: res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502, error };
  }
  return { ok: true, audio: await res.arrayBuffer(), mime: res.headers.get("content-type") ?? "audio/mpeg" };
}
