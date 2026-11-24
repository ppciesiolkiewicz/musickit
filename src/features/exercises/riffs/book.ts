import { FILES } from "./book/index.gen";
import { MAX_FRET, type RiffNote } from "./riff";

/*
 * The riff book: one JSON file per riff in `book/`, written by hand in the riff maker (/dev/riff), which opens a file and
 * saves back to it. A riff belongs to a genre and hangs off the path steps it uses; nothing on the path waits for it.
 * A file with no notes is a riff still to be written: the `riff` shape refuses it, so no exercise can show it.
 */

export const GENRES = ["blues", "rock", "funk", "jazz"] as const;
export type Genre = (typeof GENRES)[number];

export interface BookRiff {
  /** the file name: lowercase words joined by hyphens, the genre first */
  id: string;
  name: string;
  genre: Genre;
  /** the path steps the riff uses (`["power-chords:2"]`, `PATH` in plan/model/path.ts) */
  steps: string[];
  /** the key note as a pitch class, C = 0 */
  tonic: number;
  /** the scale the riff maker draws on the neck, by its name there: "Minor", "Dorian" */
  scale: string;
  bpm: number;
  /** the fret the hand sits at, for the riff maker */
  pos: number;
  notes: RiffNote[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const LENGTHS = [0.25, 0.5, 1, 2, 4].flatMap((b) => [b, b * 1.5]);

/** What is wrong with a riff's notes (empty when they are sound): each a place on the neck or a rest, of a length the riff maker writes. */
export function checkNotes(notes: unknown): string[] {
  if (!Array.isArray(notes)) return ["notes is not a list"];
  const out: string[] = [];
  notes.forEach((n, i) => {
    if (!isObj(n)) { out.push(`note ${i + 1} is not an object`); return; }
    const rest = n.string === null && n.fret === null;
    if (!rest && !(int(n.string, 0, 5) && int(n.fret, 0, MAX_FRET))) out.push(`note ${i + 1} is not on the neck (string 0-5, fret 0-${MAX_FRET}) and not a rest`);
    if (typeof n.beats !== "number" || !LENGTHS.includes(n.beats)) out.push(`note ${i + 1} has length ${JSON.stringify(n.beats)}`);
    if (n.with !== undefined && n.with !== true) out.push(`note ${i + 1}: "with" is true or left out`);
    if (n.with === true && (i === 0 || rest)) out.push(`note ${i + 1} can't join the step before it`);
  });
  return out;
}

/** What is wrong with a riff file (empty when it is sound). */
export function checkRiff(raw: unknown, id?: string): string[] {
  if (!isObj(raw)) return ["not an object"];
  const out: string[] = [];
  if (typeof raw.id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(raw.id)) out.push("id is not lowercase words joined by hyphens");
  else if (id !== undefined && raw.id !== id) out.push(`id ${raw.id} is not its file name ${id}`);
  if (typeof raw.name !== "string" || !raw.name.trim()) out.push("no name");
  if (!GENRES.includes(raw.genre as Genre)) out.push(`genre is one of ${GENRES.join(", ")}`);
  else if (typeof raw.id === "string" && !raw.id.startsWith(`${raw.genre}-`)) out.push("id does not start with its genre");
  if (!Array.isArray(raw.steps) || !raw.steps.length || raw.steps.some((s) => typeof s !== "string")) out.push("steps names at least one path step");
  if (!int(raw.tonic, 0, 11)) out.push("tonic is a pitch class 0-11");
  if (typeof raw.scale !== "string" || !raw.scale) out.push("no scale");
  if (!int(raw.bpm, 30, 240)) out.push("bpm is a whole number 30-240");
  if (!int(raw.pos, 0, MAX_FRET - 4)) out.push(`pos is a fret 0-${MAX_FRET - 4}`);
  return [...out, ...checkNotes(raw.notes)];
}

export const RIFFS: BookRiff[] = Object.keys(FILES).sort().map((k) => FILES[k] as BookRiff);

export const findRiff = (id: unknown): BookRiff | undefined => RIFFS.find((r) => r.id === id);

/** A riff as its file's text: the fields in order, one note a line. */
export function riffFileText(r: BookRiff): string {
  const { id, name, genre, steps, tonic, scale, bpm, pos } = r;
  const head = JSON.stringify({ id, name, genre, steps, tonic, scale, bpm, pos }, null, 2).slice(0, -2);
  const notes = r.notes.map((n) => `    ${JSON.stringify({ string: n.string, fret: n.fret, beats: n.beats, ...(n.with ? { with: true } : {}) })}`);
  return `${head},\n  "notes": [${notes.length ? `\n${notes.join(",\n")}\n  ` : ""}]\n}\n`;
}
