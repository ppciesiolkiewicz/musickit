import type { PlanState, StoredPlan } from "./types";

/**
 * A plan just claimed from an invite (`/plan?added=<planId>`). The claim makes it the current plan when there is none, and
 * otherwise puts it first in the earlier plans, where a player wouldn't see it: `addedPlan` is that earlier plan, so the page
 * can say so. Null when it is the current plan (it is on screen already) or not found.
 */
export function addedPlan(state: PlanState, id: string | null): StoredPlan | null {
  if (!id || state.current?.id === id) return null;
  return state.history.find((p) => p.id === id) ?? null;
}

/** The `added` id in an address (path, query and hash), and the address without it, to put back so a reload doesn't show it again. */
export function takeAdded(href: string): { id: string | null; rest: string } {
  const url = new URL(href, "http://x");
  const id = url.searchParams.get("added");
  url.searchParams.delete("added");
  return { id, rest: url.pathname + url.search + url.hash };
}
