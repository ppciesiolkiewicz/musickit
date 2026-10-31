import { catalogue } from "@/features/plan/model/catalogue";
import { devGate } from "@/features/devtools/gate";
import { describeReply, newRunId, readRunInput, type RunRecord } from "@/features/devtools/model/history";
import { listRuns, saveRun } from "@/features/devtools/server/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Every run, newest first. */
export async function GET() {
  return devGate() ?? json({ runs: await listRuns() });
}

/** Keep a reply pasted from another AI: the run's inputs plus its `reply`, recorded as model "pasted". */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const raw = await req.json().catch(() => null);
  const input = readRunInput(raw);
  if (!input.ok) return json({ error: input.error }, 400);
  const reply = (raw as { reply?: unknown }).reply;
  if (typeof reply !== "string" || !reply.trim()) return json({ error: "No reply." }, 400);
  const at = new Date();
  const record: RunRecord = { id: newRunId(at), at: at.toISOString(), model: "pasted", ...input.value, reply, ...describeReply(reply, catalogue()), durationMs: 0 };
  await saveRun(record);
  return json(record);
}
