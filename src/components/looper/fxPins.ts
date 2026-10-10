import { useSyncExternalStore } from "react";

/**
 * Effects pinned to the loop stage as widgets. Only the layout lives here (which effect, where); the effect itself stays on its input or bus.
 * Key: "g:<group id>:<fx id>", "i:<input id>:<fx id>", "m:master:<fx id>" or "e:<bus id>:<fx id>" (bus ids contain colons). Saved in localStorage `musickit.looper.fxWidgets`.
 */
export interface FxPin {
  key: string;
  x: number;
  y: number;
}

const STORAGE = "musickit.looper.fxWidgets";
/** where widgets live on the canvas, in stage units: the area to the right of and below the stage */
export const PIN_W = 330;
/** effect widgets can sit anywhere on the stage (2000 x 1200 stage units) */
export const PIN_AREA = { x: 0, y: 0, w: 2000, h: 1200 };

let spawnAt: (() => { x: number; y: number }) | null = null;
/** The stage tells where its visible corner is, so a new widget appears where you are looking. */
export function setPinSpawn(f: (() => { x: number; y: number }) | null) {
  spawnAt = f;
}

const EMPTY: FxPin[] = [];
let pins: FxPin[] | null = null;
const listeners = new Set<() => void>();

function load(): FxPin[] {
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

function set(next: FxPin[]) {
  pins = next;
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const get = (): FxPin[] => (pins ??= load());

export function usePins(): FxPin[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get,
    () => EMPTY,
  );
}

export const isPinned = (list: FxPin[], key: string) => list.some((p) => p.key === key);

/** Pin an effect in the next free spot of the widget area, or unpin it. */
export function togglePin(key: string) {
  const cur = get();
  if (isPinned(cur, key)) return set(cur.filter((p) => p.key !== key));
  const n = cur.length;
  const o = spawnAt?.() ?? { x: 0, y: 0 };
  set([...cur, { key, x: o.x + 16 + (n % 5) * 24, y: o.y + 16 + (n % 5) * 24 }]);
}

export function movePin(key: string, x: number, y: number) {
  const cx = Math.max(0, Math.min(PIN_AREA.x + PIN_AREA.w - PIN_W, x));
  const cy = Math.max(0, Math.min(PIN_AREA.y + PIN_AREA.h - 60, y));
  set(get().map((p) => (p.key === key ? { ...p, x: cx, y: cy } : p)));
}

const DEFAULTS_DONE = "musickit.looper.groupPinsDone";

/**
 * Once per project (flag `musickit.looper.groupPinsDone`): every effect of every group is shown as a widget, laid out in rows so they do
 * not cover each other on the stage. Pins that already exist stay where they are.
 */
export function pinDefaults(keys: string[]) {
  try {
    if (window.localStorage.getItem(DEFAULTS_DONE)) return;
    window.localStorage.setItem(DEFAULTS_DONE, "1");
  } catch {
    return;
  }
  const cur = get();
  const add = keys.filter((k) => !isPinned(cur, k)).slice(0, Math.max(0, 24 - cur.length));
  if (!add.length) return;
  const per = Math.max(1, Math.floor(PIN_AREA.w / (PIN_W + 10)));
  set([...cur, ...add.map((key, i) => ({ key, x: (i % per) * (PIN_W + 10), y: Math.floor(i / per) * 290 }))]);
}

/** Drop pins by key. */
export function dropPins(keys: string[]) {
  if (!keys.length) return;
  const gone = new Set(keys);
  set(get().filter((p) => !gone.has(p.key)));
}
