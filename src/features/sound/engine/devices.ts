/**
 * Which audio input (the mic the pages listen to) and output (where the app's sound plays) the person chose in the nav's
 * devices menu. Remembered in the browser, by id and by name since ids can change. Null means the system default.
 * The pure parts (listing, matching, reading the saved choice) are tested; the rest touches the browser only when called.
 */

export interface AudioDevice {
  id: string;
  label: string;
}

export interface DeviceChoice {
  input: AudioDevice | null;
  output: AudioDevice | null;
}

/** What `enumerateDevices()` gives, as far as this reads it. */
export interface RawDevice {
  kind: string;
  deviceId: string;
  label: string;
}

export const DEVICES_KEY = "musickit.audio.devices";

/** "default" and "communications" are aliases of a real device that is listed too. */
const ALIAS = new Set(["default", "communications"]);

/** Audio inputs and outputs without the aliases. Unnamed ones (no microphone access yet) are "Input 2", "Output 1", by their place. */
export function splitDevices(all: readonly RawDevice[]): { inputs: AudioDevice[]; outputs: AudioDevice[] } {
  const pick = (kind: string, fallback: string) =>
    all.filter((d) => d.kind === kind && !ALIAS.has(d.deviceId)).map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
  return { inputs: pick("audioinput", "Input"), outputs: pick("audiooutput", "Output") };
}

/** The remembered device in today's list (by id, then by name), or null when it is not plugged in. */
export function findDevice(list: readonly AudioDevice[], wanted: AudioDevice | null): AudioDevice | null {
  if (!wanted) return null;
  return list.find((d) => d.id === wanted.id) ?? list.find((d) => d.label && d.label === wanted.label) ?? null;
}

/** The name without the noise browsers add: "(Built-in)", "(Virtual)", "(1235:821a)". */
export function cleanDeviceName(label: string): string {
  const n = label.replace(/\s*\((?:built-?in|virtual|[0-9a-f]{4}:[0-9a-f]{4})\)\s*/gi, " ").replace(/\s+/g, " ").trim();
  return n || label;
}

const asDevice = (v: unknown): AudioDevice | null => {
  const d = v as Partial<AudioDevice> | null;
  return d && typeof d.id === "string" && typeof d.label === "string" ? { id: d.id, label: d.label } : null;
};

/** The saved choice from its stored JSON; anything unreadable is the system default. */
export function parseChoice(raw: string | null): DeviceChoice {
  try {
    const v = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    return { input: asDevice(v?.input), output: asDevice(v?.output) };
  } catch {
    return { input: null, output: null };
  }
}

const NONE: DeviceChoice = { input: null, output: null };
let choice: DeviceChoice | null = null;
const listeners = new Set<() => void>();

/** The current choice (the system default on the server). Stable between changes, for `useSyncExternalStore`. */
export function readDeviceChoice(): DeviceChoice {
  if (typeof window === "undefined") return NONE;
  if (!choice) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(DEVICES_KEY);
    } catch {}
    choice = parseChoice(raw);
  }
  return choice;
}

export const serverDeviceChoice = (): DeviceChoice => NONE;

export function subscribeDeviceChoice(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Change the input, the output or both; null goes back to the system default. */
export function setDeviceChoice(patch: Partial<DeviceChoice>): void {
  choice = { ...readDeviceChoice(), ...patch };
  try {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(choice));
  } catch {}
  listeners.forEach((l) => l());
}

/** True when this browser can send the sound to a chosen output (Chrome, Edge, Firefox; not Safari). */
export function canChooseOutput(): boolean {
  return typeof AudioContext !== "undefined" && typeof (AudioContext.prototype as { setSinkId?: unknown }).setSinkId === "function";
}

/** The devices the browser lists now. Names are empty until the microphone has been allowed once. */
export async function listAudioDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
  const all = (await navigator.mediaDevices?.enumerateDevices?.().catch(() => [])) ?? [];
  return splitDevices(all);
}

/** Ask for the microphone once and let it go straight away, so the browser lists every device by name. */
export async function revealDevices(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}
