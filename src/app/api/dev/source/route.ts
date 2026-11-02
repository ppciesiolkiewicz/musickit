import path from "node:path";
import { devGate } from "@/features/devtools/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Frame {
  file: string;
  line1: number;
  column1: number;
}

/**
 * Where in the source some places in the browser's bundle are: for the dev notes, which save the line of JSX that
 * renders the noted text (React keeps that call's stack in dev). Asks Next's dev server, as its error overlay does,
 * after turning "/_next/static/…" into the chunk's file under .next/dev, the form Turbopack maps. Each answer is
 * "src/…/X.tsx:74:19", or null where it can't tell (another bundler, an internal file).
 */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const body = (await req.json().catch(() => null)) as { frames?: Frame[] } | null;
  const frames = (body?.frames ?? []).filter((f) => typeof f?.file === "string" && f.file.startsWith("/_next/static/") && Number.isInteger(f.line1) && Number.isInteger(f.column1)).slice(0, 20);
  if (!frames.length) return Response.json([]);
  const dist = path.join(process.cwd(), ".next/dev");
  try {
    const res = await fetch(new URL("/__nextjs_original-stack-frames", req.url), {
      method: "POST",
      body: JSON.stringify({
        frames: frames.map((f) => ({ file: `file://${dist}${f.file.slice("/_next".length)}`, methodName: "<unknown>", line1: f.line1, column1: f.column1, arguments: [] })),
        isServer: false,
        isEdgeServer: false,
        isAppDirectory: true,
      }),
    });
    const out = (await res.json()) as { status: string; value?: { originalStackFrame?: Frame | null } }[];
    return Response.json(
      out.map((r) => {
        const f = r.value?.originalStackFrame;
        return f && !f.file.startsWith("file:") && !f.file.includes("node_modules") && !f.file.includes("/_next/") ? `${f.file}:${f.line1}:${f.column1}` : null;
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
