import { readLiveInput, subscribeLiveInput } from "./liveInput";

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

/**
 * How much louder the app plays on a touch screen while the mic is open. A phone (an iPhone always, many Android phones too) turns
 * a page's sound well down for as long as the page has the mic, and the page cannot stop it; this wins most of it back.
 */
export const MIC_BOOST_DB = 12;
const TOUCH = "(pointer: coarse)";

/** The boost's gain for `listening` mic listeners: 1 (none) off a touch screen or with the mic shut. */
export const micBoost = (listening: number, touch: boolean) => (touch && listening > 0 ? 10 ** (MIC_BOOST_DB / 20) : 1);

/**
 * The app's master gain, between the output bus and the speakers: the bus stays pre-volume so the looper still records at full level.
 * On a touch screen a boost and a limiter follow it: the boost lifts the sound while the mic is open (`micBoost`), and the limiter
 * holds the loudest notes under full scale so the lift never clips.
 */
export function attachMaster(ctx: AudioContext, bus: GainNode) {
  load();
  master = ctx.createGain();
  master.gain.value = current;
  bus.connect(master);
  const touch = typeof window !== "undefined" && window.matchMedia?.(TOUCH).matches === true;
  if (!touch) {
    master.connect(ctx.destination);
    return;
  }
  const boost = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  master.connect(boost).connect(limiter).connect(ctx.destination);
  // the live input also publishes levels many times a second; the boost moves only when the mic opens or shuts
  let level = micBoost(readLiveInput().listening, true);
  boost.gain.value = level;
  subscribeLiveInput(() => {
    const next = micBoost(readLiveInput().listening, true);
    if (next === level) return;
    level = next;
    boost.gain.setTargetAtTime(next, ctx.currentTime, 0.05);
  });
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
