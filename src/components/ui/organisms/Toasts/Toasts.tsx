"use client";

import { useEffect, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { errorText, isAbort, isNoise } from "./errors";

/**
 * Short notices at the bottom of the screen: that a change went through ("Reminder on: …"), `toast(text)`, or that
 * something failed, `onError(e, fallback)`. Call them from anywhere; `<Toasts />` is rendered once, in the root layout,
 * and is also the last net: an error nothing caught shows as the generic failure.
 */
interface Toast {
  id: number;
  text: string;
  error: boolean;
}

const EMPTY: Toast[] = [];
let list: Toast[] = EMPTY;
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dismissToast(id: number) {
  list = list.filter((t) => t.id !== id);
  emit();
}

function show(text: string, error: boolean, ms: number) {
  // the same words already showing are not shown twice: a failure that repeats stays one notice
  if (list.some((t) => t.text === text)) return;
  const id = next++;
  list = [...list.slice(-2), { id, text, error }];
  emit();
  window.setTimeout(() => dismissToast(id), ms);
}

/** Show a notice for a few seconds. At most three are shown; the oldest goes first. */
export function toast(text: string, ms = 3500) {
  show(text, false, ms);
}

/**
 * Show a failure, in the most specific words there are (`errorText`): the error's own (a `ShownError`), else `fallback`,
 * what the caller was doing ("Couldn't save the reminder. Try again."), else the generic line. An abort shows nothing.
 * Failure notices stay longer than the others.
 */
export function onError(e: unknown, fallback?: string) {
  if (isAbort(e)) return;
  show(errorText(e, fallback), true, 7000);
}

export function Toasts() {
  // the last net: a failure no code caught (a rejected promise, a thrown handler) shows the generic line
  useEffect(() => {
    const rejected = (e: PromiseRejectionEvent) => onError(e.reason);
    const thrown = (e: ErrorEvent) => {
      if (!isNoise(e.message ?? "", e.filename, window.location.origin)) onError(e.error);
    };
    window.addEventListener("unhandledrejection", rejected);
    window.addEventListener("error", thrown);
    return () => {
      window.removeEventListener("unhandledrejection", rejected);
      window.removeEventListener("error", thrown);
    };
  }, []);
  const items = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => list,
    () => EMPTY,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[2100] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role={t.error ? "alert" : undefined} className={`pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border ${t.error ? "border-amber-500/50" : "border-slate-700"} bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg shadow-black/50`}>
          {t.error ? <Icon name="alert-triangle" size={14} className="shrink-0 text-amber-300" /> : <Icon name="check" size={14} className="shrink-0 text-emerald-300" />}
          <span>{t.text}</span>
          <button type="button" className="ml-1 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><Icon name="x" size={12} /></button>
        </div>
      ))}
    </div>
  );
}
