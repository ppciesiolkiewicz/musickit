import { devGate } from "@/features/devtools/gate";
import { generateSoundEffect } from "@/features/sampler/server/elevenlabs";
import { parseGenerate, serverKey } from "@/features/sampler/server/guard";
import { PROVIDERS, type Capabilities } from "@/features/sampler/server/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What this server can do: which providers have a key in the environment. Never the keys. */
export async function GET() {
  const gate = devGate();
  if (gate) return gate;
  const body: Capabilities = {
    providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, minSeconds: p.minSeconds, maxSeconds: p.maxSeconds, server: serverKey(process.env, p.keyEnv).ok })),
  };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}

/** Generates a sample with the server's key. Development only. */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const parsed = parseGenerate(json);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });
  const key = serverKey(process.env, parsed.provider.keyEnv);
  if (!key.ok) return Response.json({ error: key.error }, { status: 403 });
  const result = await generateSoundEffect({ apiKey: key.key, prompt: parsed.prompt, seconds: parsed.seconds });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(result.audio, { headers: { "content-type": result.mime, "cache-control": "no-store" } });
}
