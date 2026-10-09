import { generateSoundEffect } from "@/features/sampler/server/elevenlabs";
import { chooseKey, createLimiter, parseGenerate } from "@/features/sampler/server/guard";
import { PROVIDERS, type Capabilities } from "@/features/sampler/server/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per server instance, so it is a brake on casual abuse rather than a hard quota. The access code is the real gate.
const limiter = createLimiter(20, 60 * 60 * 1000);

/** What this server can do: which providers have the app's key and an access code. Never the keys. */
export async function GET() {
  const body: Capabilities = {
    providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, minSeconds: p.minSeconds, maxSeconds: p.maxSeconds, server: Boolean(process.env[p.keyEnv]?.trim() && process.env.SAMPLER_ACCESS_CODE?.trim()) })),
  };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const parsed = parseGenerate(json);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });

  const key = chooseKey({
    ownKey: req.headers.get("x-provider-key"),
    accessCode: req.headers.get("x-access-code"),
    env: process.env,
    keyEnv: parsed.provider.keyEnv,
  });
  if (!key.ok) return Response.json({ error: key.error }, { status: key.status });

  const who = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!key.own && !limiter.take(who)) return Response.json({ error: "Too many samples for now. Try again later." }, { status: 429 });

  const result = await generateSoundEffect({ apiKey: key.key, prompt: parsed.prompt, seconds: parsed.seconds });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return new Response(result.audio, { headers: { "content-type": result.mime, "cache-control": "no-store" } });
}
