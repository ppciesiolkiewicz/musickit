/**
 * How each note on a neck, staff or diagram is drawn. One set of states for every view, from two layers the AI sets
 * apart: the notes the student may play (`enable`) and, among them, the ones of interest (`highlight`); plus notes to
 * mute or hide outright. This decides each note's state, the views only render it. Pure.
 */
export type NoteState = "hidden" | "muted" | "normal" | "highlighted";

/** The state of every note not enabled. */
export type Others = "normal" | "muted" | "hidden";

/** All lists are pitch classes 0-11. `add` (notes from outside the scale) is lit and enabled. */
export interface Visibility {
  /** the notes the student may play; absent: every note */
  enable?: number[];
  /** the notes of interest: ringed, and enabled even when `enable` leaves them out */
  highlight?: number[];
  mute?: number[];
  hide?: number[];
  add?: number[];
  /** the notes not enabled: "muted" (default) or "hidden" */
  others?: Others;
}

/** hide, then mute, then highlight or add; then enabled notes are normal and the rest take `others` (default muted). */
export function noteState(v: Visibility, pc: number): NoteState {
  if (v.hide?.includes(pc)) return "hidden";
  if (v.mute?.includes(pc)) return "muted";
  if (v.highlight?.includes(pc) || v.add?.includes(pc)) return "highlighted";
  if (!v.enable || v.enable.includes(pc)) return "normal";
  return v.others ?? "muted";
}

/** `others` from input: the old "dimmed" reads as "muted"; anything unknown is undefined. */
export function othersOf(v: unknown): Others | undefined {
  if (v === "dimmed") return "muted";
  return v === "normal" || v === "muted" || v === "hidden" ? v : undefined;
}

/**
 * The two layers from marks as written before `enable` existed: a highlight with `others` "muted" or "hidden" meant
 * "only these may be played", so with no `enable` that highlight is also the enabled set. Returns the lists to use.
 */
export function layersOf<T>(m: { enable?: T[]; highlight?: T[]; others?: Others }): { enable?: T[]; highlight?: T[] } {
  if (m.enable?.length || !m.highlight?.length || !m.others || m.others === "normal") return { enable: m.enable, highlight: m.highlight };
  return { enable: m.highlight, highlight: undefined };
}
