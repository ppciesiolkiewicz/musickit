/**
 * The audio devices the browser lists, cut down to what the looper shows, and the guards that keep listing them cheap: one
 * listing at a time, and no change reported when nothing changed. Pure. Imports nothing.
 */

import type { DeviceRef } from "./deviceChoice";

/** What `enumerateDevices()` gives, as far as the looper reads it. */
export interface RawDevice {
  kind: string;
  deviceId: string;
  label: string;
}

/** "default" and "communications" are aliases of a real device that is listed too. */
const ALIAS = new Set(["default", "communications"]);

/** Audio inputs and outputs, without the aliases. Unnamed ones (no microphone access yet) are "Input 2", "Output 1", by their place in the list. */
export function listDevices(all: readonly RawDevice[]): { devices: DeviceRef[]; outputs: DeviceRef[] } {
  const pick = (kind: string, fallback: string) =>
    all.filter((d) => d.kind === kind && !ALIAS.has(d.deviceId)).map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
  return { devices: pick("audioinput", "Input"), outputs: pick("audiooutput", "Output") };
}

/** True when both lists hold the same devices with the same names, in the same order. */
export function sameDevices(a: readonly DeviceRef[], b: readonly DeviceRef[]): boolean {
  return a.length === b.length && a.every((d, i) => d.id === b[i].id && d.label === b[i].label);
}

/** Wraps an async job so callers that overlap share the one running call; the next call after it settles runs it again. */
export function singleFlight<T>(job: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  return () => {
    if (!running) {
      running = job().finally(() => {
        running = null;
      });
    }
    return running;
  };
}
