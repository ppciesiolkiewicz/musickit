/**
 * Which audio devices to use without being asked: prefer an audio interface over the computer's own microphone or
 * speakers, and keep the last choice. Pure (names and ids in, a choice out). Imports nothing.
 */

export interface DeviceRef {
  id: string;
  label: string;
}

const INTERFACE = /focusrite|scarlett|clarett|\bsolo\b.*usb|behringer|\bumc\b|\bxr18|presonus|audiobox|studio ?\d|motu|universal audio|\bapollo|steinberg|\bur\d{2}|audient|\bid\d{1,2}\b|apogee|\brme\b|babyface|fireface|zoom|\bu-?\d{2}\b|roland|\bquad-?capture|native instruments|komplete audio|traktor|m-audio|\bm-?track|ploytec|\bumik|usb audio|usb pnp|audio interface|interface|\bgo\b.*\bxlr|\bpod\b|line ?6|\bhelix|boss|\bgx-?\d+|\brc-?\d{3}|loop ?station|\bvt-?\d|\bgt-?\d{3}|\bsy-?\d|\bme-?\d{2}|tascam|yamaha|\bag0\d|arturia|minifuse|\baudiofuse|\bssl ?\d|\bevo\b|\bmixer\b|\bvolt ?\d|antelope|\bzen ?(go|tour|q)\b|\bdiscrete ?\d|lewitt|rodecaster|rode ?(ai|connect)|\bmackie\b|\bonyx|alesis|\bio ?\d|\birig\b|ik multimedia|\besi\b|\bmaya\d|edirol|\bua-?\d|\bavid\b|\bmbox|digidesign|lexicon|\bkatana|\bhx ?stomp|\bpod ?go|\bvalet|\bnux\b|mooer|\bquantum\b|\bsapphire|\bsaffire|\bduet\b|\bquartet\b|\bultralite|\bmotu|\bbehringer|\bxenyx|\bflow ?8|\bx ?air|\bwing\b|\bqu-?\d|allen ?& ?heath|\bzedi|\bteenage|\bop-?1|\bpolyend|\bboss\b|\bgo:?mixer|\bmodx|\bmontage|\bkronos|\bnord\b/i;
const INTERNAL = /zoomaudiodevice|virtual|blackhole|loopback|soundflower|built-?in|macbook|imac|mac ?mini|mac ?studio|internal|speakers?\b|webcam|display|airpods|bluetooth|\bhdmi\b|realtek|conexant/i;
/** not the computer's own, but not music gear either: headsets, cameras, phones */
const PERSONAL = /headset|headphones?|earbuds|jabra|\bbrio\b|camera|\bc9\d\d\b|iphone|ipad|continuity/i;

/**
 * How much a device looks like the one to use: 2 for a known audio interface, 1 for any other device that is not the computer's own
 * part, a headset, camera or phone (an interface, looper or mixer we have no name for: any USB device plugged in for music is more likely wanted than the
 * built-in mic), -1 for the computer's own parts and virtual devices, 0 for an unnamed one (the browser hides names until access is given).
 */
export function deviceScore(label: string): number {
  if (INTERNAL.test(label)) return -1;
  if (INTERFACE.test(label)) return 2;
  return !PERSONAL.test(label) && label.trim() && !/^(input|output) \d+$/i.test(label.trim()) ? 1 : 0;
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

/** What the default inputs wait for: a guitar (Input 1 of the interface) and a vocal (Input 2). */
export type DefaultRole = "guitar" | "vocal";

/** The input mode (channel) each default role takes on an audio interface. */
export const DEFAULT_CHANNEL: Record<DefaultRole, "left" | "right"> = { guitar: "left", vocal: "right" };

/** The name of a default input: "Guitar · Scarlett 2i2", or just "Guitar" while it waits for its device. */
export const defaultInputName = (role: DefaultRole, device?: DeviceRef | null): string =>
  (device ? `${role === "guitar" ? "Guitar" : "Vocal"} · ${deviceName(device.label)}` : role === "guitar" ? "Guitar" : "Vocal").slice(0, 40);

/**
 * Which device each default input that has none yet should take, without opening anything. Only inputs with no device are touched, so
 * the inputs of an older project keep their device even when it is not plugged in. An audio interface (or another music device) is
 * given to every waiting input, each keeping its own channel. Without one, and only when `builtIn` is allowed (the person pressed
 * "Detect devices"), the vocal takes the computer's own microphone (mono); the guitar keeps waiting.
 */
export function adoptPlan(a: {
  strips: { id: number; deviceId: string; role: DefaultRole | null }[];
  devices: DeviceRef[];
  remembered?: DeviceRef | null;
  builtIn?: boolean;
}): { id: number; device: DeviceRef; mode: "left" | "right" | "sum" }[] {
  const waiting = a.strips.filter((s) => !s.deviceId && s.role);
  if (!waiting.length) return [];
  const pick = chooseDevice(a.devices, a.remembered);
  if (pick && deviceScore(pick.label) > 0) return waiting.map((s) => ({ id: s.id, device: pick, mode: DEFAULT_CHANNEL[s.role!] }));
  if (!a.builtIn) return [];
  const mic = a.devices.find((d) => deviceKind(d.label) === "builtin" && !/speaker/i.test(d.label));
  return mic ? waiting.filter((s) => s.role === "vocal").map((s) => ({ id: s.id, device: mic, mode: "sum" as const })) : [];
}

/** The default role an input's name gives it ("Guitar", "Vocal · Scarlett", the old "Scarlett Guitar"), or null. */
export const defaultRole = (name: string): DefaultRole | null => (/^vocal\b/i.test(name) ? "vocal" : /^(scarlett )?guitar\b/i.test(name) ? "guitar" : null);

export type DeviceKind = "interface" | "builtin" | "virtual" | "other";

/** A short description of a device for the devices dialog: an audio interface, the computer's own part, a virtual device, or unknown. */
export function deviceKind(label: string): DeviceKind {
  if (/virtual|blackhole|loopback|soundflower|zoomaudiodevice/i.test(label)) return "virtual";
  if (INTERNAL.test(label)) return "builtin";
  return INTERFACE.test(label) ? "interface" : "other";
}

/** The name without the noise browsers add: "(Built-in)", "(Virtual)", "(1235:821a)". */
export function deviceName(label: string): string {
  const n = label.replace(/\s*\((?:built-?in|virtual|[0-9a-f]{4}:[0-9a-f]{4})\)\s*/gi, " ").replace(/\s+/g, " ").trim();
  return n || label;
}
