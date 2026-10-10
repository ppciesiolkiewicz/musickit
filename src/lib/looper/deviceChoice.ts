/**
 * Which audio devices to use without being asked: prefer an audio interface over the computer's own microphone or
 * speakers, and keep the last choice. Pure (names and ids in, a choice out). Imports nothing.
 */

export interface DeviceRef {
  id: string;
  label: string;
}

const INTERFACE = /focusrite|scarlett|clarett|\bsolo\b.*usb|behringer|\bumc\b|\bxr18|presonus|audiobox|studio ?\d|motu|universal audio|\bapollo|steinberg|\bur\d{2}|audient|\bid\d{1,2}\b|apogee|\brme\b|babyface|fireface|zoom|\bu-?\d{2}\b|roland|\bquad-?capture|native instruments|komplete audio|traktor|m-audio|\bm-?track|ploytec|\bumik|usb audio|usb pnp|audio interface|interface|\bgo\b.*\bxlr|\bpod\b|line ?6|\bhelix|boss|\bgx-?\d+/i;
const INTERNAL = /zoomaudiodevice|virtual|blackhole|loopback|soundflower|built-?in|macbook|imac|mac ?mini|mac ?studio|internal|speakers?\b|webcam|display|airpods|bluetooth|\bhdmi\b|realtek|conexant/i;

/** How much a device looks like the one to use: positive for an audio interface, negative for the computer's own parts, 0 if unknown. */
export function deviceScore(label: string): number {
  if (INTERNAL.test(label)) return -1;
  return INTERFACE.test(label) ? 2 : 0;
}

/** The remembered device if it is still there (by id, then by name, since ids can change), else the best-looking interface, else null. */
export function chooseDevice(list: DeviceRef[], remembered?: DeviceRef | null): DeviceRef | null {
  if (remembered) {
    const same = list.find((d) => d.id === remembered.id) ?? list.find((d) => d.label && d.label === remembered.label);
    if (same) return same;
  }
  let best: DeviceRef | null = null;
  let score = 0;
  for (const d of list) {
    const s = deviceScore(d.label);
    if (s > score) {
      best = d;
      score = s;
    }
  }
  return best;
}

export interface GearIssue {
  kind: "input-idle" | "input-missing" | "input-error";
  /** the strip the issue concerns */
  strip: number;
  text: string;
}

/**
 * What is wrong with the inputs that exist: one that is not connected, one whose device is not plugged in, one that failed.
 * Nothing is suggested: devices are only connected for inputs that already use them. Empty when everything looks right.
 */
export function gearIssues(a: {
  strips: { id: number; name: string; deviceId: string; connected: boolean; error: string | null }[];
  devices: DeviceRef[];
}): GearIssue[] {
  const out: GearIssue[] = [];
  for (const s of a.strips) {
    if (s.error) out.push({ kind: "input-error", strip: s.id, text: `${s.name}: ${s.error}` });
    else if (a.devices.length && s.deviceId && !a.devices.some((d) => d.id === s.deviceId)) out.push({ kind: "input-missing", strip: s.id, text: `${s.name}: its device is not plugged in` });
    else if (!s.connected) out.push({ kind: "input-idle", strip: s.id, text: `${s.name} is not connected` });
  }
  return out;
}
