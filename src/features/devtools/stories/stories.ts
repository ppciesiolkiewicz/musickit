import { EXERCISE_EXAMPLES, PLAN_EXAMPLES } from "@/features/plan/examples";
import { TOOLS, type ToolName } from "@/features/plan/model/tools";
import { docOf, type ComponentDoc } from "@/features/exercises/docs";

/*
 * The stories on /dev/stories: every learning component, each in the set-ups the examples use plus a few hand-written
 * ones for the corners the examples miss. A story is the tool as the AI writes it, without `type`.
 */

export type Props = Record<string, unknown>;

/** One set-up of one component. */
export interface Story {
  name: string;
  props: Props;
  /** where it came from: an example's id, or "hand" */
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
  stories: Story[];
}

/** Set-ups no example has yet; position-neck's are the corners it was built for. */
const HAND: { tool: ToolName; name: string; props: Props }[] = [
  { tool: "position-neck", name: "Joining boxes: A minor pentatonic 1 & 2", props: { scale: "minor-pentatonic", key: "a", positions: [1, 2], highlight: ["1", "4", "5"] } },
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
  { tool: "interval-singer", name: "Default: M3, P5, P8 up from C", props: {} },
  { tool: "interval-singer", name: "Only the 5th, in G, alto", props: { key: "g", voice: "alto", intervals: [7] } },
  { tool: "interval-singer", name: "Random key each time: 4ths and 5ths", props: { key: "random", intervals: [5, 7] } },
  { tool: "interval-singer", name: "C, F and G: 3rds", props: { keys: ["c", "f", "g"], intervals: [3, 4] } },
  { tool: "interval-singer", name: "Hard: no dot, 3rds and 6ths both ways", props: { key: "d", intervals: [3, 4, 8, 9], dir: "both", dot: false } },
  { tool: "tuning-ears", name: "Default: 20 cents, one after the other", props: {} },
  { tool: "tuning-ears", name: "Hard: 5 cents, together", props: { cents: 5, together: true } },
  { tool: "backing-track", name: "12-bar blues in A, shuffle, 90 bpm", props: { progression: "blues", key: "a", style: "shuffle", bpm: 90 } },
  { tool: "backing-track", name: "Dorian vamp in D, its own style and tempo", props: { progression: "dorian", key: "d" } },
  { tool: "backing-track", name: "Andalusian in E minor, bossa", props: { progression: "andalusian", key: "e", style: "bossa", bpm: 110 } },
  { tool: "guitar-play-along", name: "Am arpeggio 1-3-5, box 1 to box 2", props: { shape: { shape: "arpeggio-part", chords: ["Am"], degrees: ["1", "3", "5"], bars: 4, place: [{ box: 1, part: "lower" }, { box: 1, part: "upper" }, { box: 2, part: "lower" }, { box: 2, part: "upper" }] }, bpm: 70, view: "neck" } },
  { tool: "guitar-play-along", name: "C Am F G, 1-3 per chord", props: { shape: { shape: "arpeggio-part", chords: ["C", "Am", "F", "G"], degrees: ["1", "3"], bars: 4 }, bpm: 80 } },
];

const groupId = (tool: string, props: Props): string => {
  const shape = tool === "guitar-play-along" && props.shape && typeof props.shape === "object" ? (props.shape as Props).shape : null;
  return typeof shape === "string" ? `${tool}/${shape}` : tool;
};

interface RawSection { type?: string; text?: string; tool?: Props }
interface RawExercise { title?: string; sections?: RawSection[] }

/** Every tool section of the examples, named by its exercise and the heading above it. */
function fromExamples(): { group: string; story: Story }[] {
  const out: { group: string; story: Story }[] = [];
  const take = (id: string, ex: RawExercise, prefix = "") => {
    let heading = "";
    for (const s of ex.sections ?? []) {
      if (s.type === "heading") heading = s.text ?? "";
      if (s.type !== "tool" || !s.tool || typeof s.tool.type !== "string") continue;
      const { type, ...props } = s.tool;
      const name = `${prefix}${ex.title ?? id}${heading ? ` · ${heading}` : ""}`;
      out.push({ group: groupId(type as string, props), story: { name, props, from: id } });
    }
  };
  for (const e of EXERCISE_EXAMPLES) take(e.id, e.exercise as RawExercise);
  for (const p of PLAN_EXAMPLES) {
    const days = ((p.plan as { days?: { exercises?: RawExercise[] }[] }).days ?? []);
    days.forEach((d, i) => (d.exercises ?? []).forEach((ex) => take(p.id, ex, `Day ${i + 1}: `)));
  }
  return out;
}

/** The sidebar: one group per tool (the play-along split by shape), hand stories first, then the examples', the same set-up once. */
export function storyGroups(): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  const groupOf = (id: string): StoryGroup => {
    let g = groups.get(id);
    if (!g) {
      const [tool, shape] = id.split("/") as [ToolName, string | undefined];
      g = { id, tool, ...(shape ? { shape, shapeDoc: docOf(shape) } : {}), doc: docOf(tool), stories: [] };
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
  for (const { group, story } of fromExamples()) add(group, story);
  // a tool nothing shows yet still gets its entry, with empty props to start from
  for (const t of Object.keys(TOOLS) as ToolName[]) if (t !== "guitar-play-along" && !groups.has(t)) groupOf(t).stories.push({ name: "Empty", props: {}, from: "hand" });
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}
