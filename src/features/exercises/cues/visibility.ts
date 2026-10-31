/**
 * How each note on a neck, staff or diagram is drawn. One set of states for every view: the AI lists notes to
 * highlight, mute or hide; this decides each note's state, the views only render it. Pure.
 */
export type NoteState = "hidden" | "muted" | "normal" | "highlighted";

/** The state of every note not listed. */
export type Others = "normal" | "muted" | "hidden";

/** All lists are pitch classes 0-11. `add` (notes from outside the scale) is lit, but never mutes the rest. */
export interface Visibility {
  highlight?: number[];
  mute?: number[];
  hide?: number[];
  add?: number[];
  others?: Others;
}

/** hide, then mute, then highlight or add; anything else takes `others` (muted when something is highlighted, else normal). */
export function noteState(v: Visibility, pc: number): NoteState {
  if (v.hide?.includes(pc)) return "hidden";
  if (v.mute?.includes(pc)) return "muted";
  if (v.highlight?.includes(pc) || v.add?.includes(pc)) return "highlighted";
  return v.others ?? (v.highlight?.length ? "muted" : "normal");
}

/** `others` from input: the old "dimmed" reads as "muted"; anything unknown is undefined. */
export function othersOf(v: unknown): Others | undefined {
  if (v === "dimmed") return "muted";
  return v === "normal" || v === "muted" || v === "hidden" ? v : undefined;
}
