/**
 * The studio palette: everything that can go on the stage (`paletteCatalog`, by section and subsection) and the search over it
 * ("a dorian", "e minor pent pos 1", "e shape", "sus iv", "metronome", "camera corner"), each result adding a widget or running a
 * studio command. New widgets take the master Key & scale; a key typed in the search is pinned on the widget. Pure: no React, no storage.
 */
import type { KeyChoice } from "@/features/creator/model/key";
import { CAGED_LETTERS, type CagedLetter } from "@/lib/chordKit/caged";
import type { PositionKind } from "@/lib/chordKit/scalePositions";
import { NO_MEDIA, type MediaState } from "./commands";
import { PALETTE_GROUPS, pinAgainst, subjectName, subjectTitle, type PaletteGroup, type PaletteResult, type StudioCommand, type Subject } from "./subject";

const MAX_RESULTS = 12;

/** The cheatsheet pages with a full view, in the cheatsheet's order. */
const FULL_PAGES = ["scale", "chords", "circle", "progressions", "modes", "triads", "caged", "arpeggios", "improv", "tunings"];

/** Other words a plugin goes by. */
const PLUGIN_WORDS: Record<string, string[]> = {
  scale: ["scale", "notes"],
  chords: ["chords", "chord", "library", "search", "shapes"],
  circle: ["circle", "fifths"],
  keys: ["keys", "piano", "keyboard"],
  progressions: ["progressions", "progression"],
  modes: ["modes", "mode", "scales"],
  triads: ["triads", "triad"],
  caged: ["caged"],
  arpeggios: ["arpeggios", "arpeggio", "arps"],
  improv: ["improv", "improvisation", "solo"],
  tunings: ["tunings", "tuning"],
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

const ROMAN: Record<string, number> = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
const POSITION_COUNT: Record<PositionKind, number> = { pentatonic: 5, scale: 5, "3nps": 7 };
const POSITION_SUBS: Record<PositionKind, string> = { pentatonic: "Pentatonic boxes", scale: "Scale positions", "3nps": "3 notes per string" };

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

const commandResult = (c: CommandDef): PaletteResult => ({ id: `studio:${c.label}`, label: c.label, detail: "", group: "studio", action: { type: "command", command: c.command } });

/** A catalog entry: a result and the words a search finds it by. */
interface Entry {
  result: PaletteResult;
  words: string[];
}

function entry(subject: Subject, group: PaletteGroup, detail: string, words: string[], sub?: string): Entry {
  const result: PaletteResult = { id: `${group}:${JSON.stringify(subject)}`, label: subjectName(subject), detail, group, action: { type: "add", subject } };
  if (sub) result.sub = sub;
  return { result, words: [...subjectName(subject).toLowerCase().split(/[^a-z0-9#]+/).filter(Boolean), ...words] };
}

/** Every widget there is, in `key`, by section and subsection. */
function entries(pluginIds: string[], key: KeyChoice): Entry[] {
  const has = (id: string) => pluginIds.includes(id);
  const panel = (id: string, group: PaletteGroup, detail: string, sub?: string) => (has(id) ? [entry({ kind: "plugin", plugin: id, key }, group, detail, PLUGIN_WORDS[id] ?? [], sub)] : []);
  const out: Entry[] = [
    entry({ kind: "key" }, "setup", "The master key and scale every widget follows", ["key", "scale", "master", "root", "mode"]),
    entry({ kind: "band", key }, "setup", "Click, drone, drums and bass", ["metronome", "drone", "band", "drums", "bass", "click", "tempo"]),
    entry({ kind: "tuner" }, "setup", "Tune before you play", ["tuner", "tune", "tuning"]),
    ...panel("scale", "scale", "The notes and their degrees", "Notes"),
    entry({ kind: "section", section: "relatives", key }, "scale", "The modes that share these notes", ["modes", "same", "notes", "relatives", "relative"], "Notes"),
    entry({ kind: "neck", key }, "scale", "Every note of the scale on the neck", ["fretboard", "neck", "scale", "notes"], "On the fretboard"),
    entry({ kind: "section", section: "guitar", key }, "scale", "The neck with its positions to pick from", ["fretboard", "positions", "guitar", "neck"], "On the fretboard"),
  ];
  for (const positionKind of ["pentatonic", "scale", "3nps"] as const) {
    for (let index = 0; index < POSITION_COUNT[positionKind]; index++) {
      out.push(entry({ kind: "position", key, positionKind, index }, "scale", "", ["position", "pos", "box", positionKind === "pentatonic" ? "pent" : positionKind, String(index + 1)], POSITION_SUBS[positionKind]));
    }
  }
  out.push(entry({ kind: "section", section: "chords", key }, "chords", "The chord on every note of the scale", ["chords", "chord", "every", "diatonic", "in", "key"], "In the key"));
  out.push(...panel("triads", "chords", "One chord in three inversions", "In the key"));
  out.push(...panel("arpeggios", "chords", "The chords note by note", "In the key"));
  out.push(...panel("progressions", "chords", "Common progressions in the key", "In the key"));
  for (let degree = 0; degree < 7; degree++) out.push(entry({ kind: "bubble", key, degree }, "chords", "Circle diagram", ["sus", "extensions", "extension", "bubble", "bubbles", Object.keys(ROMAN)[degree]], "Sus & extensions"));
  out.push(...panel("caged", "caged", "The five shapes, compact", "The whole neck"));
  out.push(entry({ kind: "caged", key, shape: null }, "caged", "The five boxes up the neck", ["fretboard", "neck", "map", "boxes"], "The whole neck"));
  for (const shape of CAGED_LETTERS) out.push(entry({ kind: "caged", key, shape }, "caged", "Chord, arpeggio, pentatonic and scale", ["shape", "box", shape.toLowerCase()], "One shape"));
  out.push(...panel("circle", "theory", "Keys and their neighbours"));
  out.push(...panel("keys", "theory", "The scale on a piano"));
  out.push(...panel("improv", "theory", "What to play over the key"));
  out.push(...panel("tunings", "theory", "Open and alternate tunings"));
  for (const id of FULL_PAGES) {
    if (has(id)) out.push(entry({ kind: "plugin", plugin: id, full: true, key }, "pages", "The whole page, as on the cheatsheet", ["page", "full", "cheatsheet", ...(PLUGIN_WORDS[id] ?? [])]));
  }
  out.push(entry({ kind: "logo" }, "brand", "The attunr wordmark", ["logo", "brand", "wordmark", "attunr"]));
  out.push(entry({ kind: "url" }, "brand", "Where to find the site", ["url", "link", "website", "site", "address", "brand"]));
  return out;
}

const GROUP_ORDER = Object.keys(PALETTE_GROUPS) as PaletteGroup[];

/** Results put under their category's separator. `ranked` keeps the categories in the order their best result comes (search); otherwise the palette's own order (the catalog). */
export function groupResults(results: PaletteResult[], ranked = false): { group: PaletteGroup; results: PaletteResult[] }[] {
  const order = ranked ? [...new Set(results.map((r) => r.group))] : GROUP_ORDER;
  return order.map((group) => ({ group, results: results.filter((r) => r.group === group) })).filter((g) => g.results.length > 0);
}

/**
 * Everything that can go on the stage, for the palette before anything is typed, by section: Key and sound (Key & scale, metronome,
 * tuner), Scale, Chords, CAGED, Theory, the cheatsheet pages in full, Brand, then the camera and screen share. All in the master key.
 */
export function paletteCatalog(pluginIds: string[], stageKey: KeyChoice, media: MediaState = NO_MEDIA): PaletteResult[] {
  const out = entries(pluginIds, stageKey).map((e) => e.result);
  out.push(...COMMANDS.filter((c) => c.command !== "clear" && c.applies(media)).map(commandResult));
  return groupResults(out).flatMap((g) => g.results);
}

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
  /** a CAGED shape named with "shape" after it ("e shape"); that letter is not the tonic */
  shape: CagedLetter | null;
  /** the words left once the key, the mode and a box number are taken out: what names the widget */
  rest: string[];
}

function parse(q: string): Parsed {
  const words = q.toLowerCase().replace(/^[\s/]+/, "").split(/\s+/).filter(Boolean);
  let tonic: number | null = null;
  let mode: number | null = null;
  let box: number | null = null;
  let shape: CagedLetter | null = null;
  const rest: string[] = [];
  words.forEach((w, i) => {
    const letter = CAGED_LETTERS.find((l) => l.toLowerCase() === w);
    if (letter && words[i + 1] === "shape") {
      shape = letter;
      return;
    }
    if (tonic === null && tonicPc(w) !== null) {
      tonic = tonicPc(w);
      return;
    }
    if (mode === null && w in MODE_WORDS) {
      mode = MODE_WORDS[w];
      return;
    }
    if (/^\d+$/.test(w) && ["pos", "position", "box"].includes(words[i - 1] ?? "")) {
      box = Number(w) - 1;
      return;
    }
    rest.push(w);
  });
  return { words, tonic, mode, box, shape, rest };
}

const keyFor = (p: Parsed, fallbackMode = 0): KeyChoice | null => (p.tonic === null ? null : { tonicPc: p.tonic, family: 0, mode: p.mode ?? fallbackMode });
/** a mode named without a root ("dorian") is that mode on the stage's root, so modes of one root can be compared */
const modeOnStage = (p: Parsed, stageKey: KeyChoice): KeyChoice | null =>
  p.tonic === null && p.mode !== null ? { tonicPc: stageKey.tonicPc, family: 0, mode: p.mode } : null;

/** every typed word starts one of the entry's words */
const matches = (e: Entry, typed: string[]) => typed.every((w) => e.words.some((x) => x.startsWith(w)));
/** how many typed words start a word of the name itself: "fretboard" ranks Fretboard and Fretboard positions over CAGED fretboard; ties keep the catalog order */
const nameScore = (e: Entry, typed: string[]) => {
  const name = e.result.label.toLowerCase().split(/[^a-z0-9#]+/).filter(Boolean);
  return typed.filter((w) => name.some((x) => x.startsWith(w))).length * 10 + (name[0]?.startsWith(typed[0] ?? "") ? 5 : 0);
};

function commands(p: Parsed, media: MediaState): PaletteResult[] {
  if (p.words.length === 0) return [];
  // a name that starts with what was typed ("screen" → Screen share) beats one that only lists it as a search word (Fullscreen camera)
  const named = (c: CommandDef) => p.words.filter((w) => c.label.toLowerCase().split(" ").some((x) => x.startsWith(w))).length;
  return COMMANDS.filter((c) => c.applies(media) && p.words.every((w) => c.words.some((x) => x.startsWith(w))))
    .sort((a, b) => named(b) - named(a))
    .map(commandResult);
}

/** Ranked results for a typed line, best first. `stageKey` is the master key, used when the line names none; `media` picks which camera and screen commands apply. */
export function searchPalette(query: string, pluginIds: string[], stageKey: KeyChoice, media: MediaState = NO_MEDIA): PaletteResult[] {
  const p = parse(query);
  if (p.words.length === 0) return [];
  const pent = p.rest.some((w) => w === "pent" || w === "pentatonic");
  // a pentatonic with no major/minor word is the minor one, the one guitarists mean
  const key = keyFor(p, pent ? 5 : 0) ?? modeOnStage(p, stageKey);
  const all = entries(pluginIds, key ?? stageKey);
  let found: Entry[];
  if (p.shape) found = all.filter((e) => e.result.action.type === "add" && e.result.action.subject.kind === "caged" && e.result.action.subject.shape === p.shape);
  else if (p.rest.length === 0) {
    // only a key ("a dorian"): every widget that follows a key; the metronome only when a root is typed (it has no mode)
    found = key ? all.filter((e) => e.result.action.type === "add" && "key" in e.result.action.subject && e.result.group !== "pages" && (p.tonic !== null || e.result.action.subject.kind !== "band")) : [];
  } else {
    const typed = p.rest.filter((w) => !["pos", "position", "box", "shape", "on", "the", "of", "in"].includes(w) || p.rest.length === 1);
    found = all.filter((e) => matches(e, typed));
    if (p.box !== null) {
      found = found.filter((e) => e.result.action.type === "add" && e.result.action.subject.kind === "position" && e.result.action.subject.index === p.box);
    }
    found = found.map((e, i) => ({ e, i, score: nameScore(e, typed) })).sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.e);
  }
  const keyed = found.map((e): PaletteResult => {
    if (e.result.action.type !== "add") return e.result;
    const subject = pinAgainst(e.result.action.subject, stageKey);
    return { ...e.result, label: subject === e.result.action.subject ? e.result.label : subjectTitle(subject), action: { type: "add", subject } };
  });
  // a typed word of 3+ letters that starts a command ("camera c", "scr") puts the commands first
  const cmds = commands(p, media);
  const strong = cmds.length > 0 && p.words.some((w) => w.length >= 3 && COMMANDS.some((c) => c.words.some((x) => x.startsWith(w))));
  const out = strong ? [...cmds, ...keyed] : [...keyed, ...cmds];
  return out.filter((r, i) => out.findIndex((x) => x.id === r.id) === i).slice(0, MAX_RESULTS);
}
