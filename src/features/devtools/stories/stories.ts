import { SEED_BLOCKS, seedExercises } from "@/features/library/seed";
import { TOOLS, type ToolName } from "@/features/plan/model/tools";
import { docOf, type ComponentDoc } from "@/features/exercises/docs";

/*
 * The stories on /dev/stories: every learning component, each in the set-ups the library's seed files use plus a few
 * hand-written ones for the corners the seed misses. A story is the tool as the AI writes it, without `type`.
 */

export type Props = Record<string, unknown>;

/** One set-up of one component. */
export interface Story {
  name: string;
  props: Props;
  /** where it came from: a seed file's id, or "hand" */
  from: string;
}

/** One entry in the sidebar: a tool, or the guitar play-along with one shape. */
export interface StoryGroup {
  /** "scale-neck", or "guitar-play-along/progression" */
  id: string;
  tool: ToolName;
  /** the play-along's shape, when this group is one */
  shape?: string;
  doc?: ComponentDoc;
  shapeDoc?: ComponentDoc;
  /** words the sidebar filter finds it by, beside its id and story names */
  keywords: string[];
  stories: Story[];
}

/** What a dev might type to find a component: what it does, what it trains, what a player hears or sees. */
export const KEYWORDS: Record<string, string[]> = {
  "scale-neck": ["scale", "fretboard", "neck", "positions", "boxes", "pentatonic", "mode", "guitar", "triads in the scale", "chords in the position"],
  "position-neck": ["scale", "position", "box", "fretboard", "neck", "crossing", "join", "shift", "pentatonic", "guitar"],
  "chord-shapes": ["chord", "shapes", "caged", "voicing", "triad", "diagram", "fingering", "guitar"],
  staff: ["staff", "notation", "sing", "scale", "voice", "range", "pitch", "mic", "drone", "click", "vocal"],
  "backing-band": ["backing", "band", "drums", "bass", "metronome", "click", "drone", "tempo", "jam"],
  "note-finder": ["find notes", "note names", "fretboard", "neck", "memorize", "quiz", "guitar"],
  "interval-ears": ["ear training", "interval", "hear", "listen", "recognise", "recognize", "quiz", "game", "chord changes", "progression", "numerals", "chord quality", "harmony"],
  "arpeggio-neck": ["arpeggio", "chord tones", "triad", "fretboard", "neck", "guitar"],
  "melody-singer": ["sing", "melody", "tune", "song", "voice", "pitch", "mic", "vocal"],
  "run-singer": ["sing", "run", "scale", "warm-up", "warmup", "agility", "voice", "pitch", "mic", "vocal"],
  breathwork: ["breath", "breathing", "farinelli", "exhale", "inhale", "support", "voice", "vocal", "warm-up"],
  "voice-hill": ["sing", "hill", "hum", "low", "high", "head voice", "chest voice", "sustain", "hold", "warm-up", "warmup", "voice", "vocal", "mic"],
  "lip-roll": ["lip roll", "lip trill", "lip buzz", "slide", "siren", "glide", "warm-up", "warmup", "voice", "vocal", "mic"],
  "string-singer": ["sing", "strings", "open strings", "pitch", "tuning", "by ear", "voice", "guitar", "mic"],
  "interval-singer": ["sing", "interval", "pitch", "voice", "leap", "third", "fifth", "octave", "mic", "vocal", "ear"],
  "guitar-play-along": ["play along", "guitar", "tab", "timeline", "follow", "mic"],
  "guitar-play-along/arpeggio-part": ["arpeggio", "chord tones", "play along", "guitar"],
  "guitar-play-along/chord-steps": ["chords", "riff", "steps", "double stop", "triad", "strum", "play along", "guitar"],
  "guitar-play-along/interval": ["interval", "intervals", "octave", "fifth", "fourth", "third", "sixth", "shape", "strings", "up and down", "neck", "play along", "guitar"],
  "guitar-play-along/melody": ["melody", "tune", "song", "notes", "play along", "guitar"],
  "guitar-play-along/progression": ["chord progression", "chords", "strum", "changes", "play along", "guitar"],
  "guitar-play-along/solo-over": ["solo", "improvise", "improv", "lead", "backing", "play along", "guitar"],
  "guitar-play-along/two-scales": ["two scales", "compare", "scale", "mode", "play along", "guitar"],
  "backing-track": ["backing track", "jam", "blues", "progression", "drums", "bass", "improvise", "style", "bpm"],
  "song-chart": ["song", "form", "chart", "verse", "chorus", "bridge", "chords", "changes", "bar line", "play along", "band", "by ear", "guitar"],
  "strum-along": ["strum", "strumming", "rhythm", "pattern", "chords", "timing", "guitar"],
  "clap-along": ["rhythm", "clap", "beat", "timing", "pulse", "tap", "subdivision", "metronome", "mic"],
  "staff-reading": ["staff", "reading", "notation", "note names", "treble", "bass", "clef", "ledger", "quiz", "game", "sight reading", "mic"],
  "vowel-guide": ["vowel", "vowels", "mouth", "modification", "ah", "ee", "oo", "sing", "voice", "vocal", "break", "hold", "mic"],
  video: ["video", "watch", "lesson", "clip"],
  "finger-pattern": ["fingers", "finger pattern", "chromatic", "1234", "spider", "technique", "warm-up", "guitar"],
  "picking-drill": ["picking", "alternate picking", "pick", "strokes", "technique", "speed", "guitar"],
  "legato-trill": ["legato", "trill", "hammer-on", "pull-off", "fingers", "technique", "guitar"],
  "relative-modes": ["modes", "relative", "same notes", "parent scale", "theory"],
  "mode-intervals": ["intervals", "mode", "degrees", "notes of the key", "formula", "theory"],
  "key-chords": ["chords", "diatonic", "numerals", "chords in the key", "harmony", "theory"],
  "triads": ["triads", "inversions", "string sets", "chord shapes", "guitar"],
  "progressions": ["progressions", "chords", "harmony", "numerals", "theory"],
  "circle-of-fifths": ["circle of fifths", "keys", "key signature", "relative minor", "theory"],
  "piano-keys": ["piano", "keyboard", "scale", "notes", "theory"],
  "improvisation": ["improvise", "improvisation", "motive", "rhythm", "schillinger", "ideas"],
  "tunings": ["tunings", "open tuning", "drop d", "strings", "guitar"],
  "chord-circle": ["sus", "extensions", "add9", "chord", "bubble", "harmony"],
  "caged-neck": ["caged", "shapes", "neck", "chords", "arpeggio", "guitar"],
  "double-stops-neck": ["double stop", "double stops", "thirds", "sixths", "pairs", "harmony", "fretboard", "neck", "guitar"],
};

/** Every word of the query is somewhere in the text: "sing interval" finds interval-singer. */
export const matchesQuery = (text: string, query: string): boolean => {
  const hay = text.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

/** Set-ups no seed file has yet; position-neck's are the corners it was built for. */
const HAND: { tool: ToolName; name: string; props: Props }[] = [
  { tool: "scale-neck", name: "Position 1 and the neck, roots in play", props: { scale: "minor-pentatonic", key: "a", boxes: [1], parts: { positions: "always", neck: "on" }, enable: ["1"] } },
  { tool: "scale-neck", name: "Two positions, the neck behind a chip", props: { scale: "minor-pentatonic", key: "a", boxes: [1, 2], parts: { positions: "on", neck: "off" }, highlight: ["1"] } },
  { tool: "scale-neck", name: "The neck alone", props: { scale: "major-ionian", key: "g", parts: { neck: "always" }, highlight: ["1"] } },
  { tool: "scale-neck", name: "Chords inside A minor position 1 (G B e)", props: { scale: "natural-minor-aeolian", key: "a", boxes: [1], parts: { positions: "always", neck: "on" }, chords: ["i", "iv", "bVI", "bVII"] } },
  { tool: "scale-neck", name: "Chords inside C major position 2 (D G B)", props: { scale: "major-ionian", key: "c", boxes: [2], chords: ["I", "ii", "IV", "V", "vi"], chordStrings: "432" } },
  { tool: "position-neck", name: "Joining boxes: A minor pentatonic 1 & 2", props: { scale: "minor-pentatonic", key: "a", positions: [1, 2], highlight: ["1", "4", "5"] } },
  { tool: "arpeggio-neck", name: "Am on the whole neck and its positions, roots on 6 and 5", props: { chord: "Am", show: ["neck", "positions"], roots: [6, 5] } },
  { tool: "position-neck", name: "3 notes per string, C major position 3", props: { scale: "major-ionian", key: "c", kind: "3nps", positions: [3] } },
  { tool: "position-neck", name: "Crossing 1 → 2 (G string)", props: { scale: "minor-pentatonic", key: "a", cross: { from: 1, to: 2 }, highlight: ["4", "5"] } },
  { tool: "position-neck", name: "Crossing 1 → 2 on the B string", props: { scale: "minor-pentatonic", key: "a", cross: { from: 1, to: 2, string: 2 } } },
  { tool: "position-neck", name: "Crossing 2 → 3, others hidden", props: { scale: "minor-pentatonic", key: "a", cross: { from: 2, to: 3 }, outside: "hidden" } },
  { tool: "position-neck", name: "Crossing 5 → 1 (position 5 an octave down)", props: { scale: "minor-pentatonic", key: "a", cross: { from: 5, to: 1 } } },
  { tool: "position-neck", name: "Dorian: root on the A string", props: { scale: "dorian", key: "d", placement: { by: "root", string: 5 }, highlight: ["1", "6"] } },
  { tool: "position-neck", name: "Dorian: root on the low E", props: { scale: "dorian", key: "d", placement: { by: "root", string: 6 }, highlight: ["1", "6"] } },
  { tool: "position-neck", name: "E minor pentatonic: open position", props: { scale: "minor-pentatonic", key: "e", positions: [1] } },
  { tool: "position-neck", name: "G major: positions 2, 3, 4", props: { scale: "major-ionian", key: "g", positions: [2, 3, 4] } },
  { tool: "position-neck", name: "C minor pentatonic 1 & 2, no picker", props: { scale: "minor-pentatonic", key: "c", positions: [1, 2], picker: false } },
  { tool: "string-singer", name: "Open strings, up and back", props: {} },
  { tool: "string-singer", name: "Pairs", props: { drill: "pairs" } },
  { tool: "string-singer", name: "Fifth fret, no metronome", props: { drill: "fifth-fret", metronome: false } },
  { tool: "interval-ears", name: "Chord changes, level 1: IV or V", props: { kind: "change", level: 1 } },
  { tool: "interval-ears", name: "Chord changes, level 2: with vi", props: { kind: "change", level: 2 } },
  { tool: "interval-ears", name: "Chord changes, level advanced: every chord of the key", props: { kind: "change", level: "advanced" } },
  { tool: "interval-ears", name: "Chord quality: the default five", props: { kind: "chord" } },
  { tool: "interval-ears", name: "Chord quality: major, minor, diminished, augmented", props: { kind: "chord", qualities: ["maj", "min", "dim", "aug"] } },
  { tool: "interval-ears", name: "Chord quality: 7, 9, 13 and dim7", props: { kind: "chord", qualities: ["7", "9", "13", "dim7"] } },
  { tool: "clap-along", name: "Level new: quarters at 80, 4 bars", props: { level: "new" } },
  { tool: "clap-along", name: "Eighths at 70 into the mic", props: { level: "beginner", bpm: 70, input: "mic" } },
  { tool: "clap-along", name: "Sixteenths at 60, 2 bars", props: { pattern: "sixteenths", bpm: 60, bars: 2 } },
  { tool: "clap-along", name: "Level advanced: push at 90, 8 bars", props: { level: "advanced", bpm: 90, bars: 8 } },
  { tool: "clap-along", name: "Folk strum at 100", props: { pattern: "folk", bpm: 100 } },
  { tool: "staff-reading", name: "Level new: the lines of the treble clef", props: { level: "new" } },
  { tool: "staff-reading", name: "Level beginner: the spaces", props: { level: "beginner" } },
  { tool: "staff-reading", name: "Lines and spaces together", props: { notes: "staff" } },
  { tool: "staff-reading", name: "Level intermediate: ledger lines, the mic on", props: { level: "intermediate", mic: true } },
  { tool: "staff-reading", name: "Level advanced: every note", props: { level: "advanced" } },
  { tool: "staff-reading", name: "Bass clef, the lines", props: { level: "new", clef: "bass" } },
  { tool: "staff-reading", name: "Bass clef, ledger lines", props: { clef: "bass", notes: "ledger" } },
  { tool: "video", name: "First steps: Do and Re", props: { video: "c-major-first-steps" } },
  { tool: "voice-hill", name: "Low hum", props: {} },
  { tool: "voice-hill", name: "Middle oo, 6 seconds × 3", props: { where: "middle", sound: "oo", seconds: 6, reps: 3 } },
  { tool: "voice-hill", name: "High oo", props: { where: "high", sound: "oo", seconds: 2 } },
  { tool: "vowel-guide", name: "Level beginner: five vowels on one easy note", props: { level: "beginner" } },
  { tool: "vowel-guide", name: "Level intermediate: up to the first break", props: { level: "intermediate" } },
  { tool: "vowel-guide", name: "Level advanced: across the break, tenor", props: { level: "advanced", voice: "tenor" } },
  { tool: "vowel-guide", name: "ee and oo up to the break, 2 seconds", props: { climb: "to-break", vowels: ["ee", "oo"], seconds: 2 } },
  { tool: "vowel-guide", name: "ah to oo across the break, bass", props: { climb: "across-break", vowels: ["ah", "oh", "oo"], voice: "bass" } },
  { tool: "vowel-guide", name: "One vowel, 6 seconds, soprano", props: { vowels: ["oo"], seconds: 6, voice: "soprano" } },
  { tool: "lip-roll", name: "Head to chest voice", props: {} },
  { tool: "lip-roll", name: "Siren, bass", props: { shape: "siren", voice: "bass" } },
  { tool: "lip-roll", name: "One note, 5 seconds", props: { shape: "hold" } },
  { tool: "breathwork", name: "Farinelli 4 to 8", props: {} },
  { tool: "breathwork", name: "Farinelli, short", props: { from: 2, to: 4 } },
  { tool: "breathwork", name: "Sss-zzz", props: { drill: "sss-zzz", seconds: 4, rounds: 2 } },
  { tool: "breathwork", name: "Zzz-sss", props: { drill: "zzz-sss" } },
  { tool: "breathwork", name: "Breath cycles", props: { drill: "cycles", seconds: 3, rounds: 2 } },
  { tool: "breathwork", name: "Long breath out", props: { drill: "long-exhale", seconds: 10 } },
  { tool: "breathwork", name: "Body scan", props: { drill: "body-scan", seconds: 5, rounds: 1 } },
  { tool: "interval-singer", name: "Default: M3, P5, P8 up from C", props: {} },
  { tool: "interval-singer", name: "Easier: Do and then the note play, level new, in D", props: { level: "new", key: "d", play: "both" } },
  { tool: "interval-singer", name: "Level advanced: the hard leaps, both ways, random key", props: { level: "advanced" } },
  { tool: "interval-singer", name: "No Plays switch: only Do, held by the exercise", props: { intervals: [4, 7], playSwitch: false } },
  { tool: "interval-singer", name: "With the key picker", props: { keys: ["c", "f", "g"], picker: true } },
  { tool: "interval-singer", name: "Only the 5th, in G, alto", props: { key: "g", voice: "alto", intervals: [7] } },
  { tool: "interval-singer", name: "Random key each time: 4ths and 5ths", props: { key: "random", intervals: [5, 7] } },
  { tool: "interval-singer", name: "C, F and G: 3rds", props: { keys: ["c", "f", "g"], intervals: [3, 4] } },
  { tool: "interval-singer", name: "Hard: no dot, 3rds and 6ths both ways", props: { key: "d", intervals: [3, 4, 8, 9], dir: "both", dot: false } },
  { tool: "song-chart", name: "Verse and chorus in G, the form written out, twice through", props: { key: "g", bpm: 90, sections: [{ name: "Verse", bars: ["G", "G", "C", "G"] }, { name: "Chorus", bars: ["C", "D", "G", "Em"] }], form: ["Verse", "Verse", "Chorus", "Verse"], repeat: 2 } },
  { tool: "song-chart", name: "No keys: the student plays the chords, round until stopped", props: { key: "a", bpm: 80, style: "rock", sections: [{ name: "Verse", bars: ["A", "A", "D", "A"] }, { name: "Chorus", bars: ["D", "E", "A", "A"] }], parts: { drums: "always", bass: "on" } } },
  { tool: "song-chart", name: "Verse, chorus and bridge in A minor, two chords in a bar", props: { key: "a", bpm: 100, sections: [{ name: "Verse", bars: ["Am", "F", "C", "G"] }, { name: "Chorus", bars: ["F", "G", "Am", "Am G"] }, { name: "Bridge", bars: ["Dm", "Am", "Dm", "E7"] }], form: ["Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus"], repeat: 1 } },
  { tool: "song-chart", name: "Chords hidden, to work out by ear", props: { key: "c", bpm: 80, style: "ballad", sections: [{ name: "Verse", bars: ["C", "Am", "F", "G"] }, { name: "Chorus", bars: ["F", "G", "C", "C"] }], hide: true, parts: { drums: "on", bass: "on", keys: "always" } } },
  { tool: "song-chart", name: "Chords over another bass note: the chart keeps the name, the band plays the chord", props: { key: "c", bpm: 90, sections: [{ name: "Verse", bars: ["C", "G/B", "Am", "Am(maj7)"] }, { name: "Chorus", bars: ["F", "C/E", "Dm7 G7", "C"] }] } },
  { tool: "song-chart", name: "A waltz in D, 3/4", props: { key: "d", style: "waltz", sections: [{ name: "A", bars: ["D", "G", "A7", "D"] }, { name: "B", bars: ["G", "D", "A7", "D"] }], form: ["A", "A", "B", "A"] } },
  { tool: "backing-track", name: "12-bar blues in A, shuffle, 90 bpm", props: { progression: "blues", key: "a", style: "shuffle", bpm: 90 } },
  { tool: "backing-track", name: "Dorian vamp in D, its own style and tempo", props: { progression: "dorian", key: "d" } },
  { tool: "backing-track", name: "Andalusian in E minor, bossa", props: { progression: "andalusian", key: "e", style: "bossa", bpm: 110 } },
  { tool: "guitar-play-along", name: "Octaves of G two strings over, up", props: { shape: { shape: "interval", key: "g", intervals: ["octave"], strings: "64", direction: "up", to: 7 }, bpm: 60 } },
  { tool: "guitar-play-along", name: "Octaves across strings 4 and 2, up and down, on the neck", props: { shape: { shape: "interval", key: "g", intervals: ["octave"], strings: "42", to: 7 }, bpm: 60, view: "neck" } },
  { tool: "guitar-play-along", name: "5ths down the next string", props: { shape: { shape: "interval", key: "c", intervals: ["5th"], strings: "54", direction: "down", to: 7 }, bpm: 60 } },
  { tool: "guitar-play-along", name: "3rds along the G string", props: { shape: { shape: "interval", key: "g", intervals: ["3rd"], strings: "33", to: 7 }, bpm: 60 } },
  { tool: "guitar-play-along", name: "6ths on strings 3 and 1, a drone under them", props: { shape: { shape: "interval", key: "a", intervals: ["6th"], strings: "31", to: 9 }, bpm: 60, under: "drone" } },
  { tool: "guitar-play-along", name: "From one note: a 5th and an octave above and below G", props: { shape: { shape: "interval", key: "g", intervals: ["5th", "octave"], strings: "42", walk: "note" }, bpm: 50 } },
  { tool: "guitar-play-along", name: "Every interval in turn on strings 3 and 2", props: { shape: { shape: "interval", key: "c", intervals: ["2nd", "3rd", "4th", "5th"], strings: "32", from: 0, to: 5 }, bpm: 60 } },
  { tool: "guitar-play-along", name: "A tune with an octave leap, an octave higher", props: { shape: { shape: "melody", tune: 100, key: "g", octave: 1 }, bpm: 60 } },
  { tool: "guitar-play-along", name: "Am arpeggio 1-3-5, box 1 to box 2", props: { shape: { shape: "arpeggio-part", chords: ["Am"], degrees: ["1", "3", "5"], bars: 4, place: [{ box: 1, part: "lower" }, { box: 1, part: "upper" }, { box: 2, part: "lower" }, { box: 2, part: "upper" }] }, bpm: 70, view: "neck" } },
  { tool: "guitar-play-along", name: "C Am F G, 1-3 per chord", props: { shape: { shape: "arpeggio-part", chords: ["C", "Am", "F", "G"], degrees: ["1", "3"], bars: 4 }, bpm: 80 } },
  { tool: "relative-modes", name: "A minor and its relatives", props: {"key": "a", "scale": "natural-minor-aeolian"} },
  { tool: "mode-intervals", name: "D Dorian", props: {"key": "d", "scale": "dorian"} },
  { tool: "key-chords", name: "G major", props: {"key": "g", "scale": "major-ionian"} },
  { tool: "triads", name: "C major", props: {"key": "c", "scale": "major-ionian"} },
  { tool: "progressions", name: "A minor", props: {"key": "a", "scale": "natural-minor-aeolian"} },
  { tool: "circle-of-fifths", name: "E major", props: {"key": "e", "scale": "major-ionian"} },
  { tool: "piano-keys", name: "A minor pentatonic, drawn in A minor", props: {"key": "a", "scale": "minor-pentatonic"} },
  { tool: "improvisation", name: "D Dorian", props: {"key": "d", "scale": "dorian"} },
  { tool: "tunings", name: "E minor", props: {"key": "e", "scale": "natural-minor-aeolian"} },
  { tool: "chord-circle", name: "C major, the V chord", props: {"key": "c", "scale": "major-ionian", "degree": 5} },
  { tool: "caged-neck", name: "G major, the whole neck", props: {"key": "g", "scale": "major-ionian"} },
  { tool: "caged-neck", name: "A minor, E and C shapes", props: { key: "a", scale: "natural-minor-aeolian", shapes: ["C", "E"] } },
  { tool: "double-stops-neck", name: "Level beginner: G major 3rds on G and B, frets 0 to 7", props: { key: "g", interval: "3rds", level: "beginner" } },
  { tool: "double-stops-neck", name: "Level beginner: C major 6ths on G and high e", props: { key: "c", interval: "6ths", level: "beginner" } },
  { tool: "double-stops-neck", name: "Level intermediate: G major 3rds to fret 12", props: { key: "g", interval: "3rds", level: "intermediate" } },
  { tool: "double-stops-neck", name: "Level advanced: A minor 6ths on D and B, the whole neck", props: { key: "a", scale: "natural-minor-aeolian", interval: "6ths", strings: "42", level: "advanced" } },
  { tool: "double-stops-neck", name: "E major 3rds on B and high e, frets 5 to 12", props: { key: "e", interval: "3rds", strings: "21", from: 5, to: 12 } },
  { tool: "double-stops-neck", name: "D dorian 3rds on the low E and A strings", props: { key: "d", scale: "dorian", interval: "3rds", strings: "65" } },
];

const groupId = (tool: string, props: Props): string => {
  const shape = tool === "guitar-play-along" && props.shape && typeof props.shape === "object" ? (props.shape as Props).shape : null;
  return typeof shape === "string" ? `${tool}/${shape}` : tool;
};

interface RawCell { type?: string; heading?: string; tool?: Props; cells?: RawCell[] }
interface RawExercise { title?: string; cells?: RawCell[] }

/** Every tool cell of the seed blocks and plans, named by its exercise and the section it sits in. */
function fromSeed(): { group: string; story: Story }[] {
  const out: { group: string; story: Story }[] = [];
  const take = (id: string, ex: RawExercise, prefix = "") => {
    const walk = (cells: RawCell[], heading: string) => {
      for (const s of cells) {
        if (s.type === "section") { walk(s.cells ?? [], s.heading ?? ""); continue; }
        if (s.type !== "tool" || !s.tool || typeof s.tool.type !== "string") continue;
        const { type, ...props } = s.tool;
        const name = `${prefix}${ex.title ?? id}${heading ? ` · ${heading}` : ""}`;
        out.push({ group: groupId(type as string, props), story: { name, props, from: id } });
      }
    };
    walk(ex.cells ?? [], "");
  };
  // a plan's days name block files, so the blocks hold every seed tool
  for (const f of SEED_BLOCKS) for (const ex of seedExercises(f)) take(f.id, ex as RawExercise);
  return out;
}

/** The sidebar: one group per tool (the play-along split by shape), hand stories first, then the seed's, the same set-up once. */
export function storyGroups(): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  const groupOf = (id: string): StoryGroup => {
    let g = groups.get(id);
    if (!g) {
      const [tool, shape] = id.split("/") as [ToolName, string | undefined];
      g = { id, tool, ...(shape ? { shape, shapeDoc: docOf(shape) } : {}), doc: docOf(tool), keywords: KEYWORDS[id] ?? [], stories: [] };
      groups.set(id, g);
    }
    return g;
  };
  const seen = new Set<string>();
  const add = (group: string, story: Story) => {
    const sig = `${group}:${JSON.stringify(story.props)}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    groupOf(group).stories.push(story);
  };
  for (const h of HAND) add(groupId(h.tool, h.props), { name: h.name, props: h.props, from: "hand" });
  for (const { group, story } of fromSeed()) add(group, story);
  // a tool nothing shows yet still gets its entry, with empty props to start from
  for (const t of Object.keys(TOOLS) as ToolName[]) if (t !== "guitar-play-along" && !groups.has(t)) groupOf(t).stories.push({ name: "Empty", props: {}, from: "hand" });
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}
