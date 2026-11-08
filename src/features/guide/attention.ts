"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Takes turns drawing the eye: of all the tour buttons asking for attention at once (each exercise tool's, say), only
 * the first on the page gets it, so one button wobbles, not a dozen. When it is seen (or unmounts) the next one in page
 * order takes over.
 */

/** The item that comes first by `before`; null for none. Pure, so the order rule is testable without a DOM. */
export function firstOf<T>(items: T[], before: (a: T, b: T) => boolean): T | null {
  return items.reduce<T | null>((best, x) => (best === null || before(x, best) ? x : best), null);
}

const asking = new Map<symbol, Element>();
let first: symbol | null = null;
const listeners = new Set<() => void>();

const inPageOrder = (a: [symbol, Element], b: [symbol, Element]) => !!(a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING);

function recompute() {
  const next = firstOf([...asking], inPageOrder)?.[0] ?? null;
  if (next === first) return;
  first = next;
  listeners.forEach((f) => f());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** True while `el` asks for attention (`want`) and is the first such element on the page. */
export function useAttentionTurn(want: boolean, el: Element | null): boolean {
  const [id] = useState(() => Symbol("attention"));
  useEffect(() => {
    if (!want || !el) return;
    asking.set(id, el);
    recompute();
    return () => {
      asking.delete(id);
      recompute();
    };
  }, [id, want, el]);
  return useSyncExternalStore(subscribe, () => first === id, () => false);
}
