"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";

/**
 * Keyboard shortcuts for a tool that may share its page with others (a plan's day, an exercise with three staffs): only
 * one tool takes the keys at a time. That is the tool last tapped or focused while any of it is on screen; otherwise the
 * one with the most of itself on screen. Its key caps show; the others stay quiet.
 */

/** Return true when the key was used: the page's own shortcut for it is then stopped. */
export type ToolKeyHandler = (e: KeyboardEvent, onControl: boolean) => boolean | void;

type Entry = { el: HTMLElement | null; handle: ToolKeyHandler };
const tools = new Map<string, Entry>();
const subs = new Set<() => void>();
/** the tool last tapped or focused */
let last: string | null = null;
/** the tool the keys go to now */
let target: string | null = null;
let frame = 0;

const onScreen = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
  return h > 0 && w > 0 ? h * w : 0;
};

function pick(): string | null {
  const l = last ? tools.get(last)?.el : null;
  if (last && l && onScreen(l) > 0) return last;
  let best: string | null = null;
  let most = 0;
  for (const [id, t] of tools) {
    const a = t.el ? onScreen(t.el) : 0;
    if (a > most) [best, most] = [id, a];
  }
  return best;
}

function refresh() {
  const t = pick();
  if (t === target) return;
  target = t;
  for (const f of subs) f();
}
const refreshSoon = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    refresh();
  });
};

const owner = (node: EventTarget | null) => {
  if (!(node instanceof Node)) return null;
  for (const [id, t] of tools) if (t.el?.contains(node)) return id;
  return null;
};
const touch = (e: Event) => {
  const id = owner(e.target);
  if (id && id !== last) {
    last = id;
    refreshSoon();
  }
};

function onKey(e: KeyboardEvent) {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = e.target instanceof Element ? e.target : null;
  if (el?.closest("input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true]")) return;
  refresh();
  const t = target ? tools.get(target) : undefined;
  if (!t?.el) return;
  // a dialog over the page (search, a menu) keeps the keys, unless the tool is in it (a tune in full screen)
  const modal = document.querySelector("[aria-modal=true]");
  if (modal && !modal.contains(t.el)) return;
  if (t.handle(e, !!el?.closest("button, a, summary, [role=button], [role=tab]"))) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function listen() {
  // first in line, so the tool's key stops the page's own shortcut for it
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pointerdown", touch, true);
  window.addEventListener("focusin", touch, true);
  window.addEventListener("scroll", refreshSoon, { capture: true, passive: true });
  window.addEventListener("resize", refreshSoon);
}
function unlisten() {
  window.removeEventListener("keydown", onKey, true);
  window.removeEventListener("pointerdown", touch, true);
  window.removeEventListener("focusin", touch, true);
  window.removeEventListener("scroll", refreshSoon, { capture: true });
  window.removeEventListener("resize", refreshSoon);
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/**
 * Give a tool keyboard shortcuts. Put `ref` on the tool's outer element; `armed` says the keys go to this tool now, to
 * show its key caps. Keys held down, with a modifier, or typed into a field never reach `onKey`; `onControl` says focus is
 * on a button or link, whose own Space and Enter are best left alone.
 */
export function useToolKeys<T extends HTMLElement = HTMLDivElement>(onKey: ToolKeyHandler, enabled = true): { ref: (el: T | null) => void; armed: boolean } {
  const id = useId();
  const latest = useRef(onKey);
  useEffect(() => {
    latest.current = onKey;
  });
  const el = useRef<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (tools.size === 0) listen();
    tools.set(id, { el: el.current, handle: (e, c) => latest.current(e, c) });
    refreshSoon();
    return () => {
      tools.delete(id);
      if (last === id) last = null;
      if (tools.size === 0) unlisten();
      refreshSoon();
    };
  }, [id, enabled]);
  const ref = useCallback((node: T | null) => {
    el.current = node;
    const t = tools.get(id);
    if (t) {
      t.el = node;
      refreshSoon();
    }
  }, [id]);
  const armed = useSyncExternalStore(subscribe, () => enabled && target === id, () => false);
  return { ref, armed };
}
