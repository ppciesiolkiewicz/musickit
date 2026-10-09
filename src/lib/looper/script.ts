/**
 * Scripts: a list of actions written by a person or by an AI, turned into a macro that plays as one undoable step.
 * `ACTION_CATALOG` documents every action in a form that can be pasted into a prompt, `buildPrompt` adds the current mix and the
 * effects and sounds that exist, and `parseScript` reads the reply. Imports nothing outside src/lib/looper.
 */
import { isAction, type ActionState, type LooperAction } from "./actions";
import { EFFECT_DEFS, EFFECT_KINDS } from "./effects";
import { INSTRUMENTS } from "./sequencer";
import { MAX_MACRO_STEPS, type Macro } from "./macros";

export interface CatalogEntry {
  type: LooperAction["type"];
  /** what it does, in a sentence */
  doc: string;
  /** a ready-to-copy example */
  example: LooperAction;
}

export const ACTION_CATALOG: CatalogEntry[] = [
  { type: "input.add", doc: "Add an input. kind \"device\" is a microphone or audio interface (mode left/right/stereo/sum picks the channel), \"extra\" is the built-in keyboard. Give it an id you can refer to.", example: { type: "input.add", id: 10, spec: { kind: "device", name: "Guitar", mode: "left" } } },
  { type: "input.set", doc: "Change an input: name, volume (0 to 4; above 1 boosts a quiet input), muted, solo, monitor (hear it), mode.", example: { type: "input.set", id: 10, patch: { volume: 0.8, monitor: true } } },
  { type: "input.remove", doc: "Remove a device or keyboard input.", example: { type: "input.remove", id: 10 } },
  { type: "sequencer.add", doc: "Add a drum machine (with its mixer strip). Give it an id.", example: { type: "sequencer.add", id: "drums1" } },
  { type: "sequencer.set", doc: "Set a sequencer: instrument (drums or bass), preset, rows (one string per lane, 16 characters a bar: x step, X accent, . off), clear, bars (1 or 2), dest (auto or record), x and y on the stage.", example: { type: "sequencer.set", id: "drums1", patch: { preset: "four", bars: 1 } } },
  { type: "sequencer.step", doc: "Set one step: lane 0 is the top row, step 0 is the first of 16 a bar, value 0 off, 1 step, 2 accent.", example: { type: "sequencer.step", id: "drums1", lane: 0, step: 4, value: 2 } },
  { type: "sequencer.playing", doc: "Start or stop a sequencer; it joins on the next beat.", example: { type: "sequencer.playing", id: "drums1", on: true } },
  { type: "sequencer.remove", doc: "Remove a sequencer.", example: { type: "sequencer.remove", id: "drums1" } },
  { type: "group.add", doc: "Add a group (a coloured box with its own bus and effects). patch: name, volume, x, y, w, h. Give it an id.", example: { type: "group.add", id: "wet", patch: { name: "Wet", x: 40, y: 40, w: 300, h: 260 } } },
  { type: "group.set", doc: "Change a group: name, colour, volume, muted, x, y, w, h.", example: { type: "group.set", id: "wet", patch: { volume: 0.7 } } },
  { type: "group.active", doc: "Start or stop everything inside a group.", example: { type: "group.active", id: "wet", on: true } },
  { type: "group.remove", doc: "Remove a group.", example: { type: "group.remove", id: "wet" } },
  { type: "fx.add", doc: "Add an effect to a group bus ({\"group\": id}) or an input ({\"input\": id}). params override the defaults. post true puts it after the fader.", example: { type: "fx.add", target: { input: 10 }, fx: { kind: "filter", id: "lp", params: { mode: 0, cutoff: 900, resonance: 2 } } } },
  { type: "fx.param", doc: "Change one effect parameter (for example sweep a filter cutoff).", example: { type: "fx.param", target: { input: 10 }, id: "lp", key: "cutoff", value: 3000 } },
  { type: "fx.bypass", doc: "Bypass or enable an effect.", example: { type: "fx.bypass", target: { input: 10 }, id: "lp", bypass: true } },
  { type: "fx.move", doc: "Move an effect one place earlier (-1) or later (1) in its chain.", example: { type: "fx.move", target: { input: 10 }, id: "lp", dir: -1 } },
  { type: "fx.remove", doc: "Remove an effect.", example: { type: "fx.remove", target: { input: 10 }, id: "lp" } },
  { type: "metronome.set", doc: "Metronome: bpm, beatsPerBar, volume, audible, showBeat, quantise (bars, beats, off), countInBars. Tempo is locked once a loop exists.", example: { type: "metronome.set", patch: { bpm: 100 } } },
  { type: "metronome.toggle", doc: "Metronome on or off.", example: { type: "metronome.toggle" } },
  { type: "loop.add", doc: "Add a loop slot (max 8). Loops are numbered from 0.", example: { type: "loop.add" } },
  { type: "loop.record", doc: "Record into a loop from the inputs. The first take sets the loop length.", example: { type: "loop.record", id: 0 } },
  { type: "record.stop", doc: "Stop the take in progress.", example: { type: "record.stop" } },
  { type: "loop.volume", doc: "Loop volume 0 to 1.5.", example: { type: "loop.volume", id: 0, value: 0.8 } },
  { type: "loop.mute", doc: "Mute or unmute a loop.", example: { type: "loop.mute", id: 0, muted: true } },
  { type: "loop.solo", doc: "Solo a loop.", example: { type: "loop.solo", id: 0, solo: true } },
  { type: "loop.active", doc: "Start or stop one loop on the next beat.", example: { type: "loop.active", id: 0, on: false } },
  { type: "loop.move", doc: "Move a loop on the stage; inside a group it plays through that group's bus.", example: { type: "loop.move", id: 0, x: 120, y: 120 } },
  { type: "loop.rename", doc: "Rename a loop.", example: { type: "loop.rename", id: 0, name: "Bass" } },
  { type: "loop.plan", doc: "Plan the length of the next take on a loop: 0 is free, else bars (first loop) or times the first loop (1, 2, 4, 8, 16).", example: { type: "loop.plan", id: 1, plan: 2 } },
  { type: "patch.link", doc: "Connect an element's output to another's input. port rec = a group's recorder, bus (default) = its bus or an effect or master.", example: { type: "patch.link", link: { id: "mylink", from: "in:0", to: "group:g1", port: "rec" } } },
  { type: "patch.unlink", doc: "Remove a connection.", example: { type: "patch.unlink", id: "mylink" } },
  { type: "patch.mute", doc: "Mute or unmute a connection or an element of the patch.", example: { type: "patch.mute", what: "link", id: "mylink", muted: true } },
  { type: "patch.switch", doc: "Choose which output of a switch is open (0-based).", example: { type: "patch.switch", id: "sw1", selected: 1 } },
  { type: "patch.node", doc: "Add an effect chain (kind fx, with optional effects) or a switch to the patch canvas. Give it an id. A switch lets one of its outgoing connections through.", example: { type: "patch.node", node: { id: "amp1", kind: "fx", x: 300, y: 40, name: "Amp", effects: [{ id: "e1", kind: "eq" }] } } },
  { type: "patch.removeNode", doc: "Remove an effect chain or a switch with its connections.", example: { type: "patch.removeNode", id: "amp1" } },
  { type: "patch.move", doc: "Move an element on the patch canvas.", example: { type: "patch.move", id: "amp1", x: 320, y: 80 } },
  { type: "loop.clear", doc: "Empty one loop (cannot be undone).", example: { type: "loop.clear", id: 0 } },
  { type: "playback.set", doc: "Play everything from the top, or stop.", example: { type: "playback.set", on: true } },
  { type: "master.volume", doc: "Master volume.", example: { type: "master.volume", value: 0.9 } },
  { type: "batch", doc: "Several actions as one step.", example: { type: "batch", label: "Duck", actions: [{ type: "master.volume", value: 0.5 }] } },
];

/** The effects and sounds that exist, for a prompt. */
export function describeVocabulary(): string {
  const fx = EFFECT_KINDS.map((k) => `- ${k}: ${EFFECT_DEFS[k].params.map((p) => `${p.key} ${p.min}..${p.max}${p.unit ? ` ${p.unit}` : ""} (default ${p.def})`).join(", ")}`).join("\n");
  const seq = INSTRUMENTS.map((i) => `- ${i.id}: lanes (top first) ${i.lanes.map((l) => l.label).join(", ")}; presets ${i.presets.map((p) => p.id).join(", ")}`).join("\n");
  return `Effects:\n${fx}\n\nSequencer instruments:\n${seq}`;
}

/** A short picture of the current mix: only the ids and names an action needs to point at. */
export function describeState(s: ActionState): string {
  const lines = [
    `inputs: ${s.inputs.map((i) => `${i.id} "${i.name}" (${i.kind}${i.effects.length ? `, effects ${i.effects.map((e) => `${e.id}=${e.kind}`).join(" ")}` : ""})`).join("; ") || "none"}`,
    `sequencers: ${s.sequencers.map((q) => `${q.id} "${q.name}" ${q.instrumentId}${q.playing ? " playing" : ""}`).join("; ") || "none"}`,
    `groups: ${s.groups.map((g) => `${g.id} "${g.name}"${g.effects.length ? ` (effects ${g.effects.map((e) => `${e.id}=${e.kind}`).join(" ")})` : ""}`).join("; ") || "none"}`,
    `loops: ${s.channels.length} (ids 0 to ${s.channels.length - 1})`,
    `tempo: ${s.metronome.bpm} bpm, ${s.metronome.beatsPerBar} beats a bar`,
  ];
  return lines.join("\n");
}

/** Text to paste into an AI chat. The reply goes into the Macros panel (Paste). */
export function buildPrompt(s: ActionState | null, ask = "<describe what you want here>"): string {
  return [
    "You control a browser audio looper by writing a JSON array of actions. Reply with ONLY the JSON array, no prose.",
    "Rules: create things before you refer to them; give every new input, sequencer, group and effect an id and use it afterwards; keep numbers inside the ranges below; use at most 100 actions.",
    "",
    "Actions (type, what it does, example):",
    ...ACTION_CATALOG.map((c) => `- ${c.type}: ${c.doc}\n  ${JSON.stringify(c.example)}`),
    "",
    describeVocabulary(),
    "",
    s ? `Current mix:\n${describeState(s)}\n` : "",
    `Request: ${ask}`,
  ].join("\n");
}

export interface ScriptResult {
  macro: Macro | null;
  /** one line for each action that was left out, and why */
  errors: string[];
}

/** Take the text of an AI reply or a hand-written list: a JSON array of actions, {"actions": [...]} or {"steps": [{"t", "action"}]}. Code fences are ignored. */
export function parseScript(text: string, name = "AI script"): ScriptResult {
  const body = text.replace(/```(?:json)?/gi, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    const a = body.indexOf("["), b = body.lastIndexOf("]");
    try {
      raw = a >= 0 && b > a ? JSON.parse(body.slice(a, b + 1)) : null;
    } catch {
      raw = null;
    }
  }
  const list: unknown[] | null = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { actions?: unknown }).actions) ? (raw as { actions: unknown[] }).actions : raw && typeof raw === "object" && Array.isArray((raw as { steps?: unknown }).steps) ? (raw as { steps: unknown[] }).steps : null;
  if (!list) return { macro: null, errors: ["Could not read a JSON list of actions."] };
  const errors: string[] = [];
  const steps: Macro["steps"] = [];
  list.slice(0, MAX_MACRO_STEPS).forEach((item, i) => {
    const wrapped = item && typeof item === "object" && "action" in (item as object);
    const action = wrapped ? (item as { action: unknown }).action : item;
    const t = wrapped && typeof (item as { t?: unknown }).t === "number" ? Math.max(0, (item as { t: number }).t) : 0;
    if (isAction(action)) steps.push({ t, action });
    else errors.push(`#${i + 1}: not a valid action${action && typeof action === "object" && "type" in (action as object) ? ` (${String((action as { type: unknown }).type)})` : ""}`);
  });
  if (list.length > MAX_MACRO_STEPS) errors.push(`Only the first ${MAX_MACRO_STEPS} actions were read.`);
  if (!steps.length) return { macro: null, errors };
  steps.sort((x, y) => x.t - y.t);
  return { macro: { version: 1, id: `script-${Date.now().toString(36)}`, name, createdAt: Date.now(), duration: steps[steps.length - 1].t, steps }, errors };
}
