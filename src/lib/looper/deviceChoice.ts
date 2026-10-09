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
  kind: "input-idle" | "input-missing" | "input-error" | "input-suggest" | "output-missing" | "output-suggest";
  /** the strip, for the input issues that concern one */
  strip?: number;
  text: string;
}

/** What is not connected that probably should be: the modal lists these. Empty when everything looks right. */
export function gearIssues(a: {
  strips: { id: number; name: string; deviceId: string; connected: boolean; error: string | null }[];
  devices: DeviceRef[];
  outputs: DeviceRef[];
  outputId: string;
  canChooseOutput: boolean;
  prefIn: DeviceRef | null;
  prefOut: DeviceRef | null;
}): GearIssue[] {
  const out: GearIssue[] = [];
  for (const s of a.strips) {
    if (s.error) out.push({ kind: "input-error", strip: s.id, text: `${s.name}: ${s.error}` });
    else if (!s.connected) out.push({ kind: "input-idle", strip: s.id, text: `${s.name} is not connected` });
    else if (a.devices.length && s.deviceId && !a.devices.some((d) => d.id === s.deviceId)) out.push({ kind: "input-missing", strip: s.id, text: `${s.name} is not plugged in` });
  }
  if (!a.strips.length) {
    const want = chooseDevice(a.devices, a.prefIn);
    if (want) out.push({ kind: "input-suggest", text: `Use ${want.label} as an input` });
    else if (a.prefIn) out.push({ kind: "input-missing", text: `${a.prefIn.label} is not plugged in` });
  }
  if (a.canChooseOutput) {
    const want = chooseDevice(a.outputs, a.prefOut);
    if (want && want.id !== a.outputId) out.push({ kind: "output-suggest", text: `Play through ${want.label}` });
    else if (!want && a.prefOut && a.outputs.length) out.push({ kind: "output-missing", text: `${a.prefOut.label} is not plugged in, so sound uses ${a.outputs.find((o) => o.id === a.outputId)?.label ?? "the system output"}` });
  }
  return out;
}
