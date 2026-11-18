import type { PlanState, StoredPlan } from "./types";

/**
 * A plan just claimed from an invite (`/plan?added=<planId>`). The claim puts it first in the given plans (`PlanState.given`),
 * never the current plan: `addedPlan` is that plan, so the page can say so. Null when it is not found there.
 */
export function addedPlan(state: PlanState, id: string | null): StoredPlan | null {
  if (!id) return null;
  return state.given.find((p) => p.id === id) ?? null;
}

/** The `added` id in an address (path, query and hash), and the address without it, to put back so a reload doesn't show it again. */
export function takeAdded(href: string): { id: string | null; rest: string } {
  const url = new URL(href, "http://x");
  const id = url.searchParams.get("added");
  url.searchParams.delete("added");
  return { id, rest: url.pathname + url.search + url.hash };
}
