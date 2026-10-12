import { useSyncExternalStore } from "react";

/**
 * The widgets that exist (see "Widget" in `src/lib/looper/CLAUDE.md`). Only the layout lives here (which widget, where); the effect itself stays on its input or bus.
 * Pinning a widget to the screen is the board's business (`pinnable`), not this list's.
 * Keys of effect widgets: "g:<group id>:<fx id>", "i:<input id>:<fx id>", "m:master:<fx id>" or "e:<bus id>:<fx id>" (bus ids contain colons).
 * Keys of the other widgets (Canvas only): "sw:<input block id>" (an input's "Switch between buses"), "out:<input block id>" (where its
 * output goes: "Groups and buses") and "inputs" (the Inputs list). Saved in localStorage `musickit.looper.fxWidgets`.
 */
export interface WidgetRef {
  key: string;
  x: number;
  y: number;
}

const STORAGE = "musickit.looper.fxWidgets";
/** where widgets live on the canvas, in stage units: the area to the right of and below the stage */
export const WIDGET_W = 330;
/** effect widgets can sit anywhere on the stage (2000 x 1200 stage units) */
export const WIDGET_AREA = { x: 0, y: 0, w: 2000, h: 1200 };

let spawnAt: (() => { x: number; y: number }) | null = null;
/** The stage tells where its visible corner is, so a new widget appears where you are looking. */
export function setWidgetSpawn(f: (() => { x: number; y: number }) | null) {
  spawnAt = f;
}

const EMPTY: WidgetRef[] = [];
let pins: WidgetRef[] | null = null;
const listeners = new Set<() => void>();

function load(): WidgetRef[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p) => p && typeof p.key === "string" && Number.isFinite(p.x) && Number.isFinite(p.y))
      .slice(0, 24)
      .map((p) => ({ key: String(p.key), x: Number(p.x), y: Number(p.y) }));
  } catch {
    return [];
  }
}

function set(next: WidgetRef[]) {
  pins = next;
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const get = (): WidgetRef[] => (pins ??= load());

export function useWidgetRefs(): WidgetRef[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get,
    () => EMPTY,
  );
}

export const hasWidget = (list: WidgetRef[], key: string) => list.some((p) => p.key === key);

/** Pin an effect in the next free spot of the widget area, or unpin it. */
export function toggleWidget(key: string) {
  const cur = get();
  if (hasWidget(cur, key)) return set(cur.filter((p) => p.key !== key));
  const n = cur.length;
  const o = spawnAt?.() ?? { x: 0, y: 0 };
  set([...cur, { key, x: o.x + 16 + (n % 5) * 24, y: o.y + 16 + (n % 5) * 24 }]);
}

export function moveWidget(key: string, x: number, y: number) {
  const cx = Math.max(0, Math.min(WIDGET_AREA.x + WIDGET_AREA.w - WIDGET_W, x));
  const cy = Math.max(0, Math.min(WIDGET_AREA.y + WIDGET_AREA.h - 60, y));
  set(get().map((p) => (p.key === key ? { ...p, x: cx, y: cy } : p)));
}

const DEFAULTS_DONE = "musickit.looper.groupPinsDone";

/**
 * Once per project (flag `musickit.looper.groupPinsDone`): every effect of every group is shown as a widget, laid out in rows so they do
 * not cover each other on the stage. Pins that already exist stay where they are.
 */
export function widgetDefaults(keys: string[]) {
  try {
    if (window.localStorage.getItem(DEFAULTS_DONE)) return;
    window.localStorage.setItem(DEFAULTS_DONE, "1");
  } catch {
    return;
  }
  const cur = get();
  const add = keys.filter((k) => !hasWidget(cur, k)).slice(0, Math.max(0, 24 - cur.length));
  if (!add.length) return;
  const per = Math.max(1, Math.floor(WIDGET_AREA.w / (WIDGET_W + 10)));
  set([...cur, ...add.map((key, i) => ({ key, x: (i % per) * (WIDGET_W + 10), y: Math.floor(i / per) * 290 }))]);
}

/** Drop pins by key. */
export function dropWidgets(keys: string[]) {
  if (!keys.length) return;
  const gone = new Set(keys);
  set(get().filter((p) => !gone.has(p.key)));
}

/** An input's "Switch between buses" widget, its outputs ("Groups and buses") widget, and the Inputs list. */
export const switchKey = (ownerId: string) => `sw:${ownerId}`;
export const outKey = (ownerId: string) => `out:${ownerId}`;
export const INPUTS_KEY = "inputs";

/** A widget that controls an input's buses or outputs, or the Inputs list; null for an effect widget. */
export function controlWidget(key: string): { kind: "switch" | "out"; ownerId: string } | { kind: "inputs" } | null {
  if (key === INPUTS_KEY) return { kind: "inputs" };
  if (key.startsWith("sw:")) return { kind: "switch", ownerId: key.slice(3) };
  if (key.startsWith("out:")) return { kind: "out", ownerId: key.slice(4) };
  return null;
}

const INPUTS_DONE = "musickit.looper.inputsWidgetDone";

/** Once (flag `musickit.looper.inputsWidgetDone`): the Inputs list is on show, as it always was under the metronome. */
export function inputsWidgetDefault() {
  try {
    if (window.localStorage.getItem(INPUTS_DONE)) return;
    window.localStorage.setItem(INPUTS_DONE, "1");
  } catch {
    return;
  }
  if (!hasWidget(get(), INPUTS_KEY)) set([...get(), { key: INPUTS_KEY, x: 0, y: 0 }]);
}
