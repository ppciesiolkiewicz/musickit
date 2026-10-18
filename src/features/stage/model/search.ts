/**
 * The studio palette's search: a typed line ("/ e6", "a dorian", "e minor pent pos 1", "drone a", "camera corner") turned into
 * ranked results, each adding a widget or running a studio command. Pure: no React, no storage.
 */
import { EMPTY_KEY, keyTitle, type KeyChoice } from "@/features/creator/model/key";
import { chordLabel, parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { PositionKind } from "@/lib/chordKit/scalePositions";
import { PLUGIN_TITLES, SECTIONS, subjectTitle, type PaletteResult, type ScaleSection, type StudioCommand, type Subject } from "./subject";

const MAX_RESULTS = 8;

/** The order a key's plugins are offered in: the scale first. */
const KEY_PLUGIN_ORDER = ["scale", "modes", "chords", "arpeggios", "caged", "triads", "progressions", "circle", "keys", "improv", "tunings"];

/** Words that name a plugin on their own ("circle", "caged c"). */
const PLUGIN_WORDS: Record<string, string> = {
  circle: "circle",
  fifths: "circle",
  caged: "caged",
  triads: "triads",
  triad: "triads",
  arpeggios: "arpeggios",
  arpeggio: "arpeggios",
  arps: "arpeggios",
  progressions: "progressions",
  progression: "progressions",
  modes: "modes",
  tunings: "tunings",
  tuning: "tunings",
  keys: "keys",
  piano: "keys",
  improv: "improv",
  scale: "scale",
};

const MODE_WORDS: Record<string, number> = {
  major: 0,
  ionian: 0,
  dorian: 1,
  phrygian: 2,
  lydian: 3,
  mixolydian: 4,
  minor: 5,
  aeolian: 5,
  locrian: 6,
};

const BAND_WORDS = new Set(["drone", "band", "drums", "bass", "click"]);

/** Phrases that name a scale section; every word must be in the query. */
const SECTION_PHRASES: [string[], ScaleSection][] = [
  [["every", "chord"], "chords"],
  [["chords", "in"], "chords"],
  [["sus"], "sus"],
  [["extensions"], "sus"],
  [["same", "notes"], "relatives"],
  [["relatives"], "relatives"],
  [["on", "guitar"], "guitar"],
  [["fretboard"], "guitar"],
];

const COMMANDS: [string, StudioCommand][] = [
  ["camera corner", "camera-corner"],
  ["camera full", "camera-full"],
  ["camera off", "camera-off"],
  ["screen share", "screen-share"],
  ["stop screen", "screen-stop"],
  ["clear", "clear"],
];

const COMMAND_LABELS: Record<StudioCommand, string> = {
  "camera-corner": "Camera in the corner",
  "camera-full": "Camera full frame",
  "camera-off": "Camera off",
  "screen-share": "Share a screen or window",
  "screen-stop": "Stop screen share",
  clear: "Clear the stage",
};

const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** "e", "f#", "Bb", "B♭" → pitch class; anything else → null. */
export function tonicPc(token: string): number | null {
  const m = /^([a-g])([#b♯♭]?)$/i.exec(token);
  if (!m) return null;
  const acc = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return (LETTER_PC[m[1].toLowerCase()] + acc + 12) % 12;
}

interface Parsed {
  words: string[];
  tonic: number | null;
  mode: number | null;
  box: number | null;
}

function parse(q: string): Parsed {
  const words = q.toLowerCase().replace(/^[\s/]+/, "").split(/\s+/).filter(Boolean);
  let tonic: number | null = null;
  let mode: number | null = null;
  let box: number | null = null;
  words.forEach((w, i) => {
    if (tonic === null) tonic = tonicPc(w);
    if (mode === null && w in MODE_WORDS) mode = MODE_WORDS[w];
    if ((w === "pos" || w === "position" || w === "box") && /^\d+$/.test(words[i + 1] ?? "")) box = Number(words[i + 1]) - 1;
  });
  return { words, tonic, mode, box };
}

const has = (p: Parsed, ...w: string[]) => w.every((x) => p.words.includes(x));
const keyFor = (p: Parsed, fallbackMode = 0): KeyChoice | null => (p.tonic === null ? null : { tonicPc: p.tonic, family: 0, mode: p.mode ?? fallbackMode });

function addResult(subject: Subject, group: PaletteResult["group"], detail: string): PaletteResult {
  return { id: `${group}:${JSON.stringify(subject)}`, label: subjectTitle(subject), detail, group, action: { type: "add", subject } };
}

function positions(p: Parsed): PaletteResult[] {
  const kind: PositionKind | null = has(p, "3nps") ? "3nps" : p.words.some((w) => w === "pent" || w === "pentatonic") ? "pentatonic" : null;
  if (!kind) return [];
  // a pentatonic with no major/minor word is the minor one, the one guitarists mean
  const key = keyFor(p, kind === "pentatonic" ? 5 : 0);
  if (!key) return [];
  const count = kind === "pentatonic" ? 5 : 7;
  if (p.box !== null) return p.box >= 0 && p.box < count ? [addResult({ kind: "position", key, positionKind: kind, index: p.box }, "position", "Position on the neck")] : [];
  return [0, 1, 2, 3, 4].map((index) => addResult({ kind: "position", key, positionKind: kind, index }, "position", "Position on the neck"));
}

function commands(p: Parsed): PaletteResult[] {
  if (p.words.length === 0) return [];
  return COMMANDS.filter(([phrase]) => {
    const cw = phrase.split(" ");
    return p.words.every((w) => cw.some((c) => c.startsWith(w)));
  }).map(([, command]) => ({ id: `studio:${command}`, label: COMMAND_LABELS[command], detail: "Studio", group: "studio" as const, action: { type: "command" as const, command } }));
}

/** a key positions can always be drawn in when the stage has none */
const POSITION_FALLBACK: KeyChoice = { tonicPc: 4, family: 0, mode: 5 };

/**
 * Everything that can go on the stage, for the palette before anything is typed: the Key widget, the Drone section, every theory panel
 * and scale section in the stage key, a scale position, then the camera and screen share. Chords need a name, so they are typed.
 */
export function paletteCatalog(pluginIds: string[], stageKey: KeyChoice): PaletteResult[] {
  const out: PaletteResult[] = [
    addResult({ kind: "key" }, "theory", "Changes the key of every widget"),
    addResult({ kind: "band", key: stageKey }, "audio", "Click, drone, drums and bass"),
  ];
  for (const id of KEY_PLUGIN_ORDER) if (pluginIds.includes(id)) out.push(addResult({ kind: "plugin", plugin: id, key: stageKey }, id === "scale" ? "scale" : "theory", PLUGIN_TITLES[id] ?? id));
  for (const section of Object.keys(SECTIONS) as ScaleSection[]) out.push(addResult({ kind: "section", section, key: stageKey }, "scale", SECTIONS[section]));
  out.push(addResult({ kind: "position", key: stageKey.tonicPc === null ? POSITION_FALLBACK : stageKey, positionKind: "pentatonic", index: 0 }, "position", "Position on the neck"));
  for (const command of ["camera-corner", "screen-share"] as StudioCommand[]) out.push({ id: `studio:${command}`, label: COMMAND_LABELS[command], detail: "Studio", group: "studio", action: { type: "command", command } });
  return out;
}

/** Ranked results for a typed line, best first, at most 8. `stageKey` is the Key widget's key, used when the line names none. */
export function searchPalette(query: string, pluginIds: string[], stageKey: KeyChoice): PaletteResult[] {
  const p = parse(query);
  if (p.words.length === 0) return [];
  const out: PaletteResult[] = [];
  const key = keyFor(p);
  const keyOrStage = key ?? stageKey;

  if (p.words.length === 1 && p.words[0] === "key") out.push(addResult({ kind: "key" }, "theory", "Changes the key of every widget"));

  if (p.words.some((w) => BAND_WORDS.has(w))) out.push(addResult({ kind: "band", key: keyOrStage }, "audio", "Click, drone, drums and bass"));

  for (const [phrase, section] of SECTION_PHRASES) {
    if (has(p, ...phrase) && !out.some((r) => r.action.type === "add" && r.action.subject.kind === "section" && r.action.subject.section === section)) {
      out.push(addResult({ kind: "section", section, key: keyOrStage }, "scale", SECTIONS[section]));
    }
  }

  const pluginWord = p.words.map((w) => PLUGIN_WORDS[w]).find((id) => id && pluginIds.includes(id));
  if (pluginWord && !(pluginWord === "scale" && key)) out.push(addResult({ kind: "plugin", plugin: pluginWord, key: key ?? EMPTY_KEY }, "theory", PLUGIN_TITLES[pluginWord] ?? pluginWord));

  // "g major" is also a chord symbol to tonal; with a mode word it is a key
  const chord = p.mode === null ? parseChordQuery(p.words.join(" ")) : null;
  if (chord) out.unshift(addResult({ kind: "chord", symbol: chordLabel(p.words.join(" ")) }, "chord", "Chord diagram"));

  const pos = positions(p);
  out.unshift(...pos);

  // a typed word of 3+ letters that starts a command ("camera c", "scr") puts the commands before the key's plugins
  const cmds = commands(p);
  const strong = cmds.length > 0 && p.words.some((w) => w.length >= 3 && COMMANDS.some(([phrase]) => phrase.split(" ").some((c) => c.startsWith(w))));
  if (strong) out.push(...cmds);

  if (key && out.length === (chord ? 1 : 0) + pos.length + (strong ? cmds.length : 0)) {
    for (const id of KEY_PLUGIN_ORDER) if (pluginIds.includes(id)) out.push(addResult({ kind: "plugin", plugin: id, key }, id === "scale" ? "scale" : "theory", `${PLUGIN_TITLES[id] ?? id} in ${keyTitle(key)}`));
  }

  if (!strong) out.push(...cmds);
  return out.slice(0, MAX_RESULTS);
}
