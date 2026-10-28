import { parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";

/**
 * The attunr tool an exercise shows on the plan page itself, read from its link. A small set on purpose: these are the
 * pages that work embedded and cover most practice (a scale's boxes, the notes on the neck, intervals, time).
 * Any other link stays a plain "Open" link. Add a kind here, in `EMBEDS` (what the prompt tells the AI) and in ExerciseEmbed.
 */
export type Embed =
  | { kind: "pentatonic"; slug: string; pc: number }
  | { kind: "scale"; familyIndex: number; modeIndex: number; pc: number }
  | { kind: "notes"; query: string }
  | { kind: "ears"; query: string }
  | { kind: "metronome" };

/** What the prompt says about each embedded page: the path and the settings it reads from the query. */
export const EMBEDS: { path: string; what: string }[] = [
  { path: "/theory/scales/<scale>/<key>", what: "a scale or pentatonic in a key: notes, sound and its positions (boxes) on the neck, e.g. /theory/scales/minor-pentatonic/a" },
  { path: "/theory/notes?mode=&strings=&from=&to=&naturals=&flats=", what: "fretboard-notes game. mode find|every|name; strings E,A,D,G,B,e (comma list); from/to frets 0-15; naturals 1|0; flats 1|0. e.g. /theory/notes?mode=find&strings=E,A&from=0&to=12" },
  { path: "/theory/ears?level=&set=&dir=&kind=", what: "ear training. level 1-6 (1: 5th and octave … 6: all), or set= semitones (e.g. 3,4,7); dir up|down|together; kind interval|chord" },
  { path: "/theory/metronome-drone", what: "metronome with a drone, drums and bass, for anything played in time (say the tempo in the steps)" },
];

/** The embed for a (checked) attunr link, or null when that page isn't embedded. */
export function embedFor(link: string | undefined): Embed | null {
  if (!link) return null;
  const [pathPart, rest = ""] = link.split("?");
  const path = pathPart.split("#")[0].replace(/\/$/, "");
  const query = rest.split("#")[0];
  const scale = path.match(/^\/theory\/scales\/([a-z0-9-]+)\/([a-z-]+)$/);
  if (scale) {
    const pc = parseKeySlug(scale[2]);
    if (pc === null) return null;
    if (findPentatonic(scale[1])) return { kind: "pentatonic", slug: scale[1], pc };
    const mode = findModePage(scale[1]);
    return mode ? { kind: "scale", familyIndex: mode.familyIndex, modeIndex: mode.modeIndex, pc } : null;
  }
  if (path === "/theory/notes") return { kind: "notes", query };
  if (path === "/theory/ears") return { kind: "ears", query };
  if (path === "/theory/metronome-drone") return { kind: "metronome" };
  return null;
}
