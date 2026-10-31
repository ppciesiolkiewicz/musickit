import { catalogue } from "@/features/plan/model/catalogue";
import { devGate } from "@/features/devtools/gate";
import { describeReply, newRunId, readRunRequest, type RunRecord } from "@/features/devtools/model/history";
import { runClaude } from "@/features/devtools/server/claude";
import { saveRun } from "@/features/devtools/server/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Run the prompt with the local claude CLI; the run is saved to the history whatever its outcome. Closing the request cancels it. */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const body = readRunRequest(await req.json().catch(() => null));
  if (!body.ok) return json({ error: body.error }, 400);
  const { model, effort, ...input } = body.value;
  const at = new Date();
  const out = await runClaude(input.prompt, { model, ...(effort ? { effort } : {}) }, req.signal);
  const record: RunRecord = {
    id: newRunId(at), at: at.toISOString(), model, ...input,
    ...(out.ok ? { reply: out.text, ...describeReply(out.text, catalogue()) } : { error: out.error }),
    durationMs: out.durationMs,
    ...(out.ok && out.costUsd !== undefined ? { costUsd: out.costUsd } : {}),
  };
  await saveRun(record);
  return json(record);
}
