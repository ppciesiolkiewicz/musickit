import { catalogue } from "@/features/plan/model/catalogue";
import { devGate } from "@/features/devtools/gate";
import { describeReply, newRunId, readRunRequest, type RunRecord } from "@/features/devtools/model/history";
import { runClaude } from "@/features/devtools/server/claude";
import { saveRun } from "@/features/devtools/server/history";
import { cancelRun, endRun, listRunning, startRun } from "@/features/devtools/server/running";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Runs in progress. */
export async function GET() {
  return devGate() ?? json({ running: listRunning() });
}

/**
 * Run the prompt with the local claude CLI; the run is saved to the history whatever its outcome. It outlives the request
 * (a dev reload of the page must not kill a three-minute run); only DELETE ?id= cancels it.
 */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const body = readRunRequest(await req.json().catch(() => null));
  if (!body.ok) return json({ error: body.error }, 400);
  const { model, effort, id: wanted, ...input } = body.value;
  const at = new Date();
  const id = wanted && !listRunning().some((r) => r.id === wanted) ? wanted : newRunId(at);
  const signal = startRun({ id, at: at.toISOString(), model });
  try {
    const out = await runClaude(input.prompt, { model, ...(effort ? { effort } : {}) }, signal);
    const record: RunRecord = {
      id, at: at.toISOString(), model, ...input,
      ...(out.ok ? { reply: out.text, ...describeReply(out.text, catalogue()) } : { error: out.error }),
      durationMs: out.durationMs,
      ...(out.ok && out.costUsd !== undefined ? { costUsd: out.costUsd } : {}),
    };
    await saveRun(record);
    return json(record);
  } finally {
    endRun(id);
  }
}

/** Cancel a run in progress: DELETE /api/dev/run?id=<run id>. */
export async function DELETE(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return cancelRun(id) ? json({ cancelled: id }) : json({ error: "No such run in progress." }, 404);
}
