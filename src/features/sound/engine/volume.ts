const KEY = "musickit.volume";
export const DEFAULT_VOLUME = 0.8;

let current = DEFAULT_VOLUME;
let loaded = false;
const listeners = new Set<() => void>();
let master: GainNode | null = null;

export const clampVolume = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : DEFAULT_VOLUME);

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== null) current = clampVolume(JSON.parse(raw));
  } catch { /* storage unavailable */ }
}

/** The app's master gain, between the output bus and the speakers: the bus stays pre-volume so the looper still records at full level. */
export function attachMaster(ctx: AudioContext, bus: GainNode) {
  load();
  master = ctx.createGain();
  master.gain.value = current;
  bus.connect(master).connect(ctx.destination);
}

export function getVolume() {
  load();
  return current;
}

export function setVolume(v: number) {
  current = clampVolume(v);
  try { window.localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  master?.gain.setTargetAtTime(current, master.context.currentTime, 0.02);
  listeners.forEach((f) => f());
}

export function subscribeVolume(fn: () => void) {
  load();
  listeners.add(fn);
  queueMicrotask(fn);
  return () => { listeners.delete(fn); };
}
