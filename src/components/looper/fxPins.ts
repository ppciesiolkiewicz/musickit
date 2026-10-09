import { useSyncExternalStore } from "react";

/**
 * Effects pinned to the loop stage as widgets. Only the layout lives here (which effect, where); the effect itself stays on its input or bus.
 * Key: "g:<group id>:<fx id>" or "i:<input id>:<fx id>". Saved in localStorage `musickit.looper.fxWidgets`.
 */
export interface FxPin {
  key: string;
  x: number;
  y: number;
}

const STORAGE = "musickit.looper.fxWidgets";
/** where widgets live on the canvas, in stage units: the area to the right of and below the stage */
export const PIN_W = 330;
export const PIN_AREA = { x: 1000, y: 0, w: 700, h: 700 };

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
  set([...cur, { key, x: PIN_AREA.x + 20 + (n % 2) * (PIN_W + 10), y: 20 + Math.floor(n / 2) * 230 }]);
}

export function movePin(key: string, x: number, y: number) {
  const cx = Math.max(0, Math.min(PIN_AREA.x + PIN_AREA.w - PIN_W, x));
  const cy = Math.max(0, Math.min(PIN_AREA.y + PIN_AREA.h - 60, y));
  set(get().map((p) => (p.key === key ? { ...p, x: cx, y: cy } : p)));
}

/** Drop pins by key. */
export function dropPins(keys: string[]) {
  if (!keys.length) return;
  const gone = new Set(keys);
  set(get().filter((p) => !gone.has(p.key)));
}
