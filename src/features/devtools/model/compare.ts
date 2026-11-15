import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { DEMO_PLANS, demoPlan } from "@/features/plan/demos";
import { promptParts } from "@/features/plan/model/prompt";
import { composePrompt, type Composed } from "./compose";
import type { RunRecord, RunSummary } from "./history";
import type { DevModel } from "./models";
import type { Persona } from "./personas";
import { apiCost } from "./pricing";

/** What "Compare AI models for autoplan" shares between the script that writes the plans and the page that shows them. */

/** The first-week prompt for a made-up player, as the app would build it. */
export const personaPrompt = (p: Persona, entries: CatalogueEntry[]): Composed => composePrompt(promptParts(p.answers, entries, []), {});

/** Characters in an average hand-tuned demo plan: the size the estimate takes for a reply. */
export function demoReplyChars(): number {
  const sizes = Object.keys(DEMO_PLANS).map((s) => JSON.stringify(demoPlan(s)?.config ?? {}).length);
  return Math.round(sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length));
}

/** A run's tokens at API prices (a local model at its OpenRouter price); null with no token counts or no price. */
export function runCost(r: Pick<RunRecord, "model" | "usage">): number | null {
  return r.model === "pasted" || !r.usage ? null : apiCost(r.model, r.usage);
}

/** The newest run per player and model, by `${persona}|${model}`; failed runs only where nothing succeeded. */
export function latestByCell(runs: RunSummary[]): Map<string, RunSummary> {
  const out = new Map<string, RunSummary>();
  for (const r of [...runs].sort((a, b) => a.at.localeCompare(b.at))) {
    if (!r.persona || r.model === "pasted") continue;
    const k = cellKey(r.persona, r.model);
    const had = out.get(k);
    if (r.ok || !had?.ok) out.set(k, r);
  }
  return out;
}

export const cellKey = (persona: string, model: DevModel) => `${persona}|${model}`;
