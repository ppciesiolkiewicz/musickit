/**
 * What a stage widget shows: its subject. Plain data (saved, recorded in the widget track, replayed), no React.
 * Key-aware subjects carry their own key. The Key & scale widget is the master: a widget follows it, except for the parts of its key
 * changed on the widget itself (`pinned`). A widget pinned to Dorian keeps Dorian when the master scale changes but still moves to a
 * new master root, so modes of one root can be compared side by side. Chord diagrams never move.
 */
import { EMPTY_KEY, keyContext, modeName, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { tonicName } from "@/features/theory";
import { ARP_QUALITIES } from "@/lib/chordKit/arpeggios";
import { CAGED_LETTERS, formsFor, type CagedLetter } from "@/lib/chordKit/caged";
import type { PositionKind } from "@/lib/chordKit/scalePositions";
import { TOOLS, type PlanTool, type ToolName } from "@/features/plan/model/tools";
import { refTitle, sanitiseVideoRef, type VideoRef } from "@/features/videos/ref";
import { STAGE_TOOLS, toolKey, withToolKey } from "./toolKey";
import { ARP_ROOT_STRINGS, cagedQualityOf as cagedQuality, describeParts } from "./families";

export { cagedQualityOf } from "./families";

/** Every chord in the key · Relative modes · Scale on guitar */
export type ScaleSection = "chords" | "relatives" | "guitar";

/** The parts of a widget's key changed on the widget: the master no longer moves them. */
export type KeyPart = "tonic" | "scale";

interface Keyed {
  key: KeyChoice;
  pinned?: KeyPart[];
}

export type Subject =
  | { kind: "chord"; symbol: string }
  /** a cheatsheet panel: its compact view, or with `full` the whole theory page */
  | ({ kind: "plugin"; plugin: string; full?: boolean } & Keyed)
  | ({ kind: "position"; positionKind: PositionKind; index: number } & Keyed)
  /** the metronome: click, drone, drums and bass */
  | ({ kind: "band" } & Keyed)
  | ({ kind: "section"; section: ScaleSection } & Keyed)
  /** one chord of the key (degree 0..6) with the sus and extension chords around it: one circle diagram */
  | ({ kind: "bubble"; degree: number } & Keyed)
  /** the scale's notes on the whole neck */
  | ({ kind: "neck" } & Keyed)
  /** the five CAGED boxes on the whole neck (no shape), or one box: its chord, arpeggio, pentatonic and scale; `shapes` (CAGED order, non-empty) stacks several boxes and wins over `shape` */
  | ({ kind: "caged"; shape: CagedLetter | null; shapes?: CagedLetter[] } & Keyed)
  /**
   * an arpeggio of the key, as on the arpeggios page: on a degree (0..6), `type` the scale's own triad, seventh or ninth or an `ARP_QUALITIES` id;
   * the whole neck (`neck`) and the positions (`positions: false` hides them), `roots` the root strings shown (guitar numbering, 6 is the low E; absent: all)
   */
  | ({ kind: "arpeggio"; degree: number; type: string; neck?: boolean; positions?: false; roots?: number[] } & Keyed)
  /**
   * a learning component of the AI plan (`STAGE_TOOLS`), stored as the plan parses it. The master moves its key (tonic) only;
   * its scale is its own. `pinned` can only hold the tonic.
   */
  | { kind: "tool"; tool: PlanTool; pinned?: ["tonic"] }
  | { kind: "key" }
  | { kind: "tuner" }
  /** the studio's one audio input (guitar or voice; saved as "mic"): the notes it hears light up on the pinned and selected widgets */
  | { kind: "mic" }
  | { kind: "logo" }
  | { kind: "url" }
  /** a block of words in a note: plain text, `# ` starts a title, `## ` a heading and `### ` a subheading, a blank line a new paragraph (`parseText`) */
  | { kind: "text"; text: string }
  /** a notice in a note: use headphones, so the microphone doesn't hear the app's own sound (fixed words, `HeadphonesNotice`) */
  | { kind: "headphones" }
  /** a video: one from the library, or one the teacher recorded, kept in that browser (`@/features/videos`) */
  | { kind: "video"; video: VideoRef }
  | { kind: "camera" }
  | { kind: "screen" }
  /** widget videos only (not in the palette): the tune's notes across a following staff; `beats` is how many fit across, absent = the staff's default 10 */
  | { kind: "melody"; beats?: number }
  /** widget videos only (not in the palette): the count-in before a tune */
  | { kind: "countdown" }
  /** widget videos only (not in the palette): the video's title and a line of text, before the first countdown */
  | { kind: "intro" }
  /** widget videos only (not in the palette): which tune of how many, and which pass of how many */
  | { kind: "progress" }
  /** widget videos only (not in the palette): the tune after this one, in solfège, or that this is the last */
  | { kind: "next" };

/** How many beats a melody can show across. */
export const MELODY_BEATS = { min: 2, max: 16 } as const;

/** The longest text a text widget keeps. */
export const TEXT_MAX = 4000;

export type TextBlock = { type: "title" | "h1" | "h2" | "p"; text: string };

/** A text widget's words as blocks: `# ` title (drawn like the page title), `## ` heading, `### ` subheading, anything else a paragraph; blank lines separate, a line break inside a paragraph stays. */
export function parseText(text: string): TextBlock[] {
  const out: TextBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: "p", text: para.join("\n") });
    para = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flush();
      out.push({ type: (["title", "h1", "h2"] as const)[h[1].length - 1], text: h[2].trim() });
    } else if (!line.trim()) flush();
    else para.push(line);
  }
  flush();
  return out;
}

export type StudioCommand = "video-add" | "video-record" | "camera-corner" | "camera-full" | "camera-off" | "screen-share" | "screen-corner" | "screen-full" | "screen-stop" | "clear";

export interface PaletteResult {
  id: string;
  label: string;
  detail: string;
  group: PaletteGroup;
  /** a subsection inside the group ("On the fretboard"), shown as a smaller heading */
  sub?: string;
  /**
   * `add` puts the subject on the stage; `command` runs a studio command; `family` offers a widget family (`families.ts`) in `key`:
   * the palette opens it in place, its props to pick and its widgets on the stage.
   */
  action: { type: "add"; subject: Subject } | { type: "command"; command: StudioCommand } | { type: "family"; familyId: string; key: KeyChoice };
}

/** The palette's categories, in the order it lists them, with the name on each separator. */
export const PALETTE_GROUPS = {
  setup: "Key and sound",
  scale: "Scale",
  chords: "Chords",
  caged: "CAGED",
  theory: "Theory",
  pages: "Cheatsheet pages",
  text: "Text",
  video: "Video",
  brand: "Brand",
  studio: "Studio",
} as const;
export type PaletteGroup = keyof typeof PALETTE_GROUPS;

export const SECTIONS: Record<ScaleSection, string> = {
  chords: "Chords in the key",
  relatives: "Relative modes",
  guitar: "Fretboard positions",
};

/** The creator plugins' titles, for names that need no React (the registry itself holds components). */
export const PLUGIN_TITLES: Record<string, string> = {
  scale: "Scale",
  chords: "Chords",
  circle: "Circle of fifths",
  keys: "Keys",
  progressions: "Progressions",
  modes: "Modes",
  triads: "Triads",
  caged: "CAGED",
  arpeggios: "Arpeggios",
  improv: "Improvisation",
  tunings: "Tunings",
};

/** A compact panel's name on the stage, where it sits beside other widgets. */
const PANEL_NAMES: Record<string, string> = { ...PLUGIN_TITLES, scale: "Intervals within each mode", keys: "Piano keys", caged: "CAGED overview" };

const POSITION_KINDS: PositionKind[] = ["pentatonic", "scale", "3nps"];
const POSITION_NAMES: Record<PositionKind, string> = { pentatonic: "Pentatonic box", scale: "Scale position", "3nps": "3 notes per string, position" };
const DEGREE_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const isKeyed = (s: Subject): s is Extract<Subject, Keyed> => "key" in s;

type ToolSubject = Extract<Subject, { kind: "tool" }>;
/** A tool widget moved to the tonic `pc` (none: as it is); its pins stay. */
const toolTo = (s: ToolSubject, pc: number | null): ToolSubject => (pc === null ? s : { ...s, tool: withToolKey(s.tool, pc) });

/** The subject's `KeyChoice`. A tool widget has none: its key is a pitch class on the tool (`toolKey`) and its scale a slug. */
export function keyOf(s: Subject): KeyChoice | null {
  return isKeyed(s) ? s.key : null;
}

/** The subject in another key, nothing pinned or unpinned (a tool takes the tonic only); subjects without a key (chord, logo, url, camera, screen, tuner, audio input, the Key widget) come back as they are. */
export function withKey(s: Subject, key: KeyChoice): Subject {
  if (s.kind === "tool") return toolTo(s, key.tonicPc);
  return isKeyed(s) ? { ...s, key } : s;
}

const sameScale = (a: KeyChoice, b: KeyChoice) => a.family === b.family && a.mode === b.mode;

/** The subject after the master Key & scale changed to `master`: every part of its key that is not pinned follows (a tool's tonic only). */
export function withMaster(s: Subject, master: KeyChoice): Subject {
  if (s.kind === "tool") return s.pinned ? s : toolTo(s, master.tonicPc);
  if (!isKeyed(s)) return s;
  const pinned = s.pinned ?? [];
  const tonicPc = pinned.includes("tonic") ? s.key.tonicPc : master.tonicPc;
  const scale = pinned.includes("scale") ? s.key : master;
  return { ...s, key: { tonicPc, family: scale.family, mode: scale.mode } };
}

/** The subject's key changed on the widget: the parts that changed are pinned, so the master leaves them alone from now on. */
export function withOwnKey(s: Subject, key: KeyChoice): Subject {
  if (s.kind === "tool") {
    const own = toolKey(s.tool);
    return own === null || key.tonicPc === null || key.tonicPc === own ? s : { ...toolTo(s, key.tonicPc), pinned: ["tonic"] };
  }
  if (!isKeyed(s)) return s;
  const pins = new Set(s.pinned ?? []);
  if (key.tonicPc !== s.key.tonicPc) pins.add("tonic");
  if (!sameScale(key, s.key)) pins.add("scale");
  return { ...s, key, pinned: [...pins] };
}

/** Back to following the master in everything. */
export function followMaster(s: Subject, master: KeyChoice): Subject {
  if (s.kind === "tool") return withMaster({ kind: "tool", tool: s.tool }, master);
  if (!isKeyed(s)) return s;
  const { pinned: _pinned, ...rest } = s;
  void _pinned;
  return withMaster(rest as Subject, master);
}

/**
 * A new widget picked with a key of its own ("g dorian fretboard"): what differs from the master is pinned. A tool is pinned
 * when it was made in a key other than the master's (`madeIn`, the master's when not given), or its own key is not that key's
 * tonic (an arpeggio given G7 in C). A family makes a widget in C when the key has no root, so one made on a stage with no root
 * is not pinned and follows the master once it is set.
 */
export function pinAgainst(s: Subject, master: KeyChoice, madeIn: KeyChoice = master): Subject {
  if (s.kind === "tool") {
    const own = toolKey(s.tool);
    const made = madeIn.tonicPc;
    return own !== null && (made !== master.tonicPc || own !== (made ?? 0)) ? { ...s, pinned: ["tonic"] } : s;
  }
  if (!isKeyed(s)) return s;
  const pins: KeyPart[] = [];
  if (s.key.tonicPc !== master.tonicPc) pins.push("tonic");
  if (!sameScale(s.key, master)) pins.push("scale");
  return pins.length ? { ...s, pinned: pins } : s;
}

/** A control rather than something to look at: it sets, plays or listens to something for the lesson (the master key, the metronome, the tuner, the audio input). */
export const isControl = (s: Subject): boolean => s.kind === "key" || s.kind === "band" || s.kind === "tuner" || s.kind === "mic";

/** A page rather than a single widget: a whole cheatsheet page, or a scale-page section with parts to pick from (Fretboard positions, Chords in the key). */
export const isPage = (s: Subject): boolean => (s.kind === "plugin" && s.full === true) || (s.kind === "section" && s.section !== "relatives");

/** Whether the widget is mainly a guitar neck, so it reads better wide. A page may hold necks too, but it has its own size. */
export function hasNeck(s: Subject): boolean {
  switch (s.kind) {
    case "position":
    case "neck":
    case "caged":
    case "arpeggio":
      return true;
    case "tool":
      return ["scale-neck", "position-neck", "arpeggio-neck"].includes(s.tool.type);
    default:
      return false;
  }
}

/** The cheatsheet panels that draw fretboards or chord boxes: compact, and as whole pages. */
const MIC_PANELS = ["caged"];
const MIC_PAGES = ["scale", "modes", "chords", "progressions", "caged"];

/**
 * Whether the audio input lights notes on the widget: it draws fretboards, scale positions or chord boxes, which ring the note heard.
 * Keep in step with the renderers (ScaleNeck, PositionBox, ChordDiagram, and on their pages the arpeggio necks and TriadBox read
 * `HeardNote`, as do the scale-neck, arpeggio-neck and chord-shapes tools through them); a staff tool draws the input's pitch; the rest
 * show nothing.
 */
export function takesMic(s: Subject): boolean {
  switch (s.kind) {
    case "chord":
    case "position":
    case "neck":
    case "bubble":
    case "arpeggio":
      return true;
    case "tool":
      // the necks and chord boxes ring the note heard (PositionBox, ChordDiagram); the position neck draws its own dots and doesn't.
      // A staff listens unless its mic is off (on by default), and draws the pitch
      return s.tool.type === "staff" ? s.tool.mic !== false : ["scale-neck", "arpeggio-neck", "chord-shapes"].includes(s.tool.type);
    case "section":
      return s.section !== "relatives";
    case "plugin":
      return (s.full ? MIC_PAGES : MIC_PANELS).includes(s.plugin);
    default:
      return false;
  }
}

/** Which widget a subject is, whatever its key: the palette ticks a row when a widget with the same identity is on the stage. */
export function subjectIdentity(s: Subject): string {
  // a tool without its key: moved to C, so an arpeggio keeps its chord's quality but not its root
  if (s.kind === "tool") return JSON.stringify({ kind: "tool", tool: withToolKey(s.tool, 0) });
  if (!isKeyed(s)) return JSON.stringify(s);
  const { key: _key, pinned: _pinned, ...rest } = s;
  void _key;
  void _pinned;
  return JSON.stringify(rest);
}

const ROOT_STRING: Record<number, string> = { 6: "low E", 5: "A", 4: "D", 3: "G", 1: "high e" };

/** "E shape (root on low E)": which string a CAGED shape's root sits on is the same in major and minor. */
export function cagedShapeName(letter: CagedLetter): string {
  const rs = formsFor("major").find((f) => f.letter === letter)?.rs ?? 6;
  return `${letter} shape (root on ${ROOT_STRING[rs]})`;
}

/** What the widget is, without its key: "Fretboard", "Pentatonic box 2", "CAGED E shape (root on low E)". */
export function subjectName(s: Subject): string {
  switch (s.kind) {
    case "chord":
      return `${s.symbol} chord`;
    case "plugin":
      return s.full ? `${PLUGIN_TITLES[s.plugin] ?? s.plugin} page` : PANEL_NAMES[s.plugin] ?? s.plugin;
    case "position":
      return `${POSITION_NAMES[s.positionKind]} ${s.index + 1}`;
    case "band":
      return "Metronome";
    case "section":
      return SECTIONS[s.section];
    case "bubble": {
      const ch = keyContext({ ...s.key, tonicPc: s.key.tonicPc ?? 0 })?.chords[s.degree];
      return `Sus & extensions · ${ch?.roman ?? DEGREE_ROMAN[s.degree]}`;
    }
    case "neck":
      return "Fretboard";
    case "caged":
      if (s.shapes?.length) return s.shapes.length === 1 ? `CAGED ${cagedShapeName(s.shapes[0])}` : `CAGED shapes ${s.shapes.join(", ")}`;
      return s.shape === null ? "CAGED fretboard" : `CAGED ${cagedShapeName(s.shape)}`;
    case "arpeggio": {
      const p = describeParts(s);
      return p ? [p.name, p.detail].filter(Boolean).join(" · ") : "Arpeggio";
    }
    case "tool": {
      // its family's name and main props ("Major pentatonic · positions 1, 2"); a tool no family offers goes by its type (a run or a backing track, only in preset notes, by a word)
      const p = describeParts(s);
      return p ? [p.name, p.detail].filter(Boolean).join(" · ") : s.tool.type === "run-singer" ? "Run" : s.tool.type === "backing-track" ? "Backing track" : s.tool.type;
    }
    case "key":
      return "Key & scale";
    case "tuner":
      return "Tuner";
    case "mic":
      return "Audio input";
    case "logo":
      return "Logo";
    case "url":
      return "Site address";
    case "text": {
      const first = parseText(s.text)[0]?.text.replace(/\s+/g, " ");
      return first ? `Text · ${first.length > 24 ? `${first.slice(0, 24)}…` : first}` : "Text";
    }
    case "headphones":
      return "Use headphones";
    case "video":
      return `Video · ${refTitle(s.video)}`;
    case "camera":
      return "Camera";
    case "screen":
      return "Screen share";
    case "melody":
      return "Melody";
    case "countdown":
      return "Countdown";
    case "intro":
      return "Intro";
    case "progress":
      return "Tune progress";
    case "next":
      return "Up next";
  }
}

/** The widget's scale as its title shows it ("Dorian", CAGED "minor"), with the root only when it is pinned off the master's ("G Dorian"). */
export function keyLabel(s: Subject): string | null {
  if (s.kind === "tool") {
    // the key its family names ("C major"), else the tool's own root
    const p = describeParts(s);
    if (p) return p.key;
    const k = toolKey(s.tool);
    return k === null ? null : tonicName(k);
  }
  if (!isKeyed(s)) return null;
  const root = s.pinned?.includes("tonic") && s.key.tonicPc !== null ? `${tonicName(s.key.tonicPc)} ` : "";
  if (s.kind === "band") return root ? root.trim() : null;
  return `${root}${s.kind === "caged" ? cagedQuality(s.key) : modeName(s.key)}`;
}

/**
 * The widget's title: its name and its scale, never the master's root ("Fretboard · Dorian"). A tool widget is the exception: its
 * title is its row text, key in the middle ("Major pentatonic · C major · positions 1, 2"), as its key and scale are its own props.
 */
export function subjectTitle(s: Subject): string {
  if (s.kind === "tool") {
    const p = describeParts(s);
    if (p) return [p.name, p.key, p.detail].filter(Boolean).join(" · ");
  }
  const label = keyLabel(s);
  return label ? `${subjectName(s)} · ${label}` : subjectName(s);
}

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const keyFrom = (v: unknown): KeyChoice => (obj(v) ? sanitiseKey(v) : EMPTY_KEY);

/** The key and the pinned parts of a saved key-aware subject. */
function keyedFrom(o: Record<string, unknown>): Keyed {
  const pinned = Array.isArray(o.pinned) ? (["tonic", "scale"] as const).filter((p) => (o.pinned as unknown[]).includes(p)) : [];
  return pinned.length ? { key: keyFrom(o.key), pinned } : { key: keyFrom(o.key) };
}

/** A saved or recorded subject, or null when it is not one we can show (an unknown plugin, a missing field). */
export function sanitiseSubject(raw: unknown, pluginIds: string[]): Subject | null {
  const o = obj(raw);
  if (!o) return null;
  switch (o.kind) {
    case "chord":
      return typeof o.symbol === "string" && o.symbol.trim() ? { kind: "chord", symbol: o.symbol.trim() } : null;
    case "plugin":
      if (typeof o.plugin !== "string" || !pluginIds.includes(o.plugin)) return null;
      return o.full === true ? { kind: "plugin", plugin: o.plugin, full: true, ...keyedFrom(o) } : { kind: "plugin", plugin: o.plugin, ...keyedFrom(o) };
    case "position": {
      const kind = POSITION_KINDS.find((k) => k === o.positionKind);
      const index = o.index;
      if (!kind || typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 6) return null;
      return { kind: "position", positionKind: kind, index, ...keyedFrom(o) };
    }
    case "band":
      return { kind: "band", ...keyedFrom(o) };
    case "section": {
      // the old single "Sus and extensions" section is now one widget per chord: it comes back as the first
      if (o.section === "sus") return { kind: "bubble", degree: 0, ...keyedFrom(o) };
      const section = (Object.keys(SECTIONS) as ScaleSection[]).find((k) => k === o.section);
      return section ? { kind: "section", section, ...keyedFrom(o) } : null;
    }
    case "bubble":
      return typeof o.degree === "number" && Number.isInteger(o.degree) && o.degree >= 0 && o.degree <= 6 ? { kind: "bubble", degree: o.degree, ...keyedFrom(o) } : null;
    case "neck":
      return { kind: "neck", ...keyedFrom(o) };
    case "caged": {
      if (o.shape !== null && o.shape !== undefined && !CAGED_LETTERS.includes(o.shape as CagedLetter)) return null;
      const shapes = Array.isArray(o.shapes) ? CAGED_LETTERS.filter((l) => (o.shapes as unknown[]).includes(l)) : [];
      return { kind: "caged", shape: (o.shape as CagedLetter | undefined) ?? null, ...(shapes.length ? { shapes } : {}), ...keyedFrom(o) };
    }
    case "arpeggio": {
      const { degree, type } = o;
      if (typeof degree !== "number" || !Number.isInteger(degree) || degree < 0 || degree > 6) return null;
      if (typeof type !== "string" || !["triad", "seventh", "ninth", ...ARP_QUALITIES.map((q) => q.id)].includes(type)) return null;
      const roots = Array.isArray(o.roots) ? ARP_ROOT_STRINGS.filter((n) => (o.roots as unknown[]).includes(n)) : [];
      return { kind: "arpeggio", degree, type, ...(o.neck === true ? { neck: true } : {}), ...(o.neck === true && o.positions === false ? { positions: false as const } : {}), ...(roots.length ? { roots } : {}), ...keyedFrom(o) };
    }
    case "tool": {
      const t = obj(o.tool);
      if (!t || !STAGE_TOOLS.includes(t.type as ToolName)) return null;
      const tool = TOOLS[t.type as ToolName].parse(t);
      if (!tool) return null;
      return Array.isArray(o.pinned) && o.pinned.includes("tonic") ? { kind: "tool", tool, pinned: ["tonic"] } : { kind: "tool", tool };
    }
    case "key":
    case "tuner":
    case "mic":
    case "logo":
    case "url":
    case "headphones":
    case "camera":
    case "screen":
      return { kind: o.kind };
    case "text":
      return typeof o.text === "string" ? { kind: "text", text: o.text.slice(0, TEXT_MAX) } : null;
    case "video": {
      const video = sanitiseVideoRef(o.video);
      return video ? { kind: "video", video } : null;
    }
    case "melody": {
      const beats = o.beats;
      return typeof beats === "number" && Number.isInteger(beats) && beats >= MELODY_BEATS.min && beats <= MELODY_BEATS.max ? { kind: "melody", beats } : { kind: "melody" };
    }
    case "countdown":
    case "intro":
    case "progress":
    case "next":
      return { kind: o.kind };
    default:
      return null;
  }
}
