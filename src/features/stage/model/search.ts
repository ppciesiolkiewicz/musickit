/**
 * The studio palette's search: a typed line ("/ e6", "a dorian", "e minor pent pos 1", "drone a", "camera corner") turned into
 * ranked results, each adding a widget or running a studio command. Pure: no React, no storage.
 */
import { EMPTY_KEY, keyTitle, type KeyChoice } from "@/features/creator/model/key";
import { chordLabel, parseChordQuery } from "@/lib/chordKit/chordSearch";
import type { PositionKind } from "@/lib/chordKit/scalePositions";
import { NO_MEDIA, type MediaState } from "./commands";
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
const LOGO_WORDS = new Set(["logo", "brand", "wordmark", "attunr"]);
const URL_WORDS = new Set(["url", "link", "website", "site", "address", "brand"]);

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

interface CommandDef {
  label: string;
  command: StudioCommand;
  /** words a typed line can start; every typed word must start one of them */
  words: string[];
  /** offered only when it does something: no "Close camera" without a camera */
  applies: (m: MediaState) => boolean;
}

const COMMANDS: CommandDef[] = [
  { label: "Camera", command: "camera-corner", words: ["camera", "webcam", "start", "add"], applies: (m) => m.camera === "none" },
  { label: "Fullscreen camera", command: "camera-full", words: ["fullscreen", "full", "screen", "maximize", "big", "camera", "webcam"], applies: (m) => m.camera === "corner" },
  { label: "Minimize camera", command: "camera-corner", words: ["minimize", "small", "corner", "camera", "webcam"], applies: (m) => m.camera === "full" },
  { label: "Close camera", command: "camera-off", words: ["close", "off", "stop", "remove", "camera", "webcam"], applies: (m) => m.camera !== "none" },
  { label: "Screen share", command: "screen-share", words: ["screen", "share", "window", "start"], applies: (m) => m.screen === "none" },
  { label: "Fullscreen screen share", command: "screen-full", words: ["fullscreen", "full", "screen", "share", "maximize", "big"], applies: (m) => m.screen === "corner" },
  { label: "Minimize screen share", command: "screen-corner", words: ["minimize", "small", "corner", "screen", "share"], applies: (m) => m.screen === "full" },
  { label: "Close screen share", command: "screen-stop", words: ["close", "stop", "off", "remove", "screen", "share"], applies: (m) => m.screen !== "none" },
  { label: "Clear the stage", command: "clear", words: ["clear"], applies: () => true },
];

const commandResult = (c: CommandDef): PaletteResult => ({ id: `studio:${c.label}`, label: c.label, detail: "Studio", group: "studio", action: { type: "command", command: c.command } });

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

function commands(p: Parsed, media: MediaState): PaletteResult[] {
  if (p.words.length === 0) return [];
  // a name that starts with what was typed ("screen" → Screen share) beats one that only lists it as a search word (Fullscreen camera)
  const named = (c: CommandDef) => p.words.filter((w) => c.label.toLowerCase().split(" ").some((x) => x.startsWith(w))).length;
  return COMMANDS.filter((c) => c.applies(media) && p.words.every((w) => c.words.some((x) => x.startsWith(w))))
    .sort((a, b) => named(b) - named(a))
    .map(commandResult);
}

const LOGO_RESULT = addResult({ kind: "logo" }, "brand", "The attunr wordmark");
const URL_RESULT = addResult({ kind: "url" }, "brand", "Where to find the site");

/** a key positions can always be drawn in when the stage has none */
const POSITION_FALLBACK: KeyChoice = { tonicPc: 4, family: 0, mode: 5 };

/**
 * Everything that can go on the stage, for the palette before anything is typed: the Key widget, the Drone section, every theory panel
 * and scale section in the stage key, a scale position, the logo and the site address, then the camera and screen share. Chords need a name, so they are typed.
 */
export function paletteCatalog(pluginIds: string[], stageKey: KeyChoice, media: MediaState = NO_MEDIA): PaletteResult[] {
  const out: PaletteResult[] = [
    addResult({ kind: "key" }, "theory", "Changes the key of every widget"),
    addResult({ kind: "band", key: stageKey }, "audio", "Click, drone, drums and bass"),
  ];
  for (const id of KEY_PLUGIN_ORDER) if (pluginIds.includes(id)) out.push(addResult({ kind: "plugin", plugin: id, key: stageKey }, id === "scale" ? "scale" : "theory", PLUGIN_TITLES[id] ?? id));
  for (const section of Object.keys(SECTIONS) as ScaleSection[]) out.push(addResult({ kind: "section", section, key: stageKey }, "scale", SECTIONS[section]));
  out.push(addResult({ kind: "position", key: stageKey.tonicPc === null ? POSITION_FALLBACK : stageKey, positionKind: "pentatonic", index: 0 }, "position", "Position on the neck"));
  out.push(LOGO_RESULT, URL_RESULT);
  out.push(...COMMANDS.filter((c) => c.command !== "clear" && c.applies(media)).map(commandResult));
  return out;
}

/** Ranked results for a typed line, best first, at most 8. `stageKey` is the Key widget's key, used when the line names none; `media` picks which camera and screen commands apply. */
export function searchPalette(query: string, pluginIds: string[], stageKey: KeyChoice, media: MediaState = NO_MEDIA): PaletteResult[] {
  const p = parse(query);
  if (p.words.length === 0) return [];
  const out: PaletteResult[] = [];
  const key = keyFor(p);
  const keyOrStage = key ?? stageKey;

  if (p.words.length === 1 && p.words[0] === "key") out.push(addResult({ kind: "key" }, "theory", "Changes the key of every widget"));

  if (p.words.some((w) => BAND_WORDS.has(w))) out.push(addResult({ kind: "band", key: keyOrStage }, "audio", "Click, drone, drums and bass"));
  if (p.words.some((w) => LOGO_WORDS.has(w))) out.push(LOGO_RESULT);
  if (p.words.some((w) => URL_WORDS.has(w))) out.push(URL_RESULT);

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
  const cmds = commands(p, media);
  const strong = cmds.length > 0 && p.words.some((w) => w.length >= 3 && COMMANDS.some((c) => c.words.some((x) => x.startsWith(w))));
  if (strong) out.push(...cmds);

  if (key && out.length === (chord ? 1 : 0) + pos.length + (strong ? cmds.length : 0)) {
    for (const id of KEY_PLUGIN_ORDER) if (pluginIds.includes(id)) out.push(addResult({ kind: "plugin", plugin: id, key }, id === "scale" ? "scale" : "theory", `${PLUGIN_TITLES[id] ?? id} in ${keyTitle(key)}`));
  }

  if (!strong) out.push(...cmds);
  return out.slice(0, MAX_RESULTS);
}
