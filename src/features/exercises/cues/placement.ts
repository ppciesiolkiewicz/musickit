/**
 * Where on the neck a scale or arpeggio box goes. The AI says how to choose ("next to open chords", "root on the low
 * E"); `pickBox` picks the box from the ones the view computed. Pure.
 */
export type Placement =
  | { by: "box"; box: number }
  | { by: "open" }
  | { by: "fret"; fret: number }
  /** guitar numbering: 6 is the low E */
  | { by: "root"; string: 6 | 5 | 4 }
  /** near the chord shapes shown in the same exercise; resolved to another form when the plan is pasted */
  | { by: "chords" };

export type StoredPlacement = Exclude<Placement, { by: "chords" }>;

/** One box as `pickBox` needs it. Strings: 0 is the low E. */
export interface BoxInfo {
  number: number;
  from: number;
  to: number;
  roots: { string: number; fret: number }[];
}

/** A box to show, and how far to move it: 0, or -12 for a box high on the neck played an octave down. */
export interface PickedBox { number: number; shift: 0 | -12 }

/** Every box where it is, and again an octave down when that still fits on the neck. */
function candidates(boxes: BoxInfo[]): (BoxInfo & { shift: 0 | -12 })[] {
  const down = boxes.filter((b) => b.from >= 12).map((b) => ({ ...b, from: b.from - 12, to: b.to - 12, roots: b.roots.map((r) => ({ ...r, fret: r.fret - 12 })), shift: -12 as const }));
  return [...boxes.map((b) => ({ ...b, shift: 0 as const })), ...down];
}

/** The best candidate by `score` (lowest), ties to the lower `from`; null when none scores. */
function best(boxes: BoxInfo[], score: (b: BoxInfo) => number | null): PickedBox | null {
  let pick: { b: BoxInfo & { shift: 0 | -12 }; s: number } | null = null;
  for (const b of candidates(boxes)) {
    const s = score(b);
    if (s === null) continue;
    if (!pick || s < pick.s || (s === pick.s && b.from < pick.b.from)) pick = { b, s };
  }
  return pick && { number: pick.b.number, shift: pick.b.shift };
}

/** The box the placement asks for, or null when none fits (the view then shows what it shows today). */
export function pickBox(boxes: BoxInfo[], p: StoredPlacement): PickedBox | null {
  switch (p.by) {
    case "box":
      return boxes.some((b) => b.number === p.box) ? { number: p.box, shift: 0 } : null;
    case "open":
      return best(boxes, (b) => b.from);
    case "fret":
      return best(boxes, (b) => Math.abs((b.from + b.to) / 2 - p.fret));
    case "root": {
      const string = 6 - p.string;
      return best(boxes, (b) => {
        const frets = b.roots.filter((r) => r.string === string).map((r) => r.fret);
        return frets.length ? Math.min(...frets) - b.from : null;
      });
    }
  }
}

/** A placement from the AI's JSON, checked: null when it can't be read. */
export function parsePlacement(v: unknown): Placement | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const int = (n: unknown, lo: number, hi: number) => (Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi ? (n as number) : null);
  switch (o.by) {
    case "open":
    case "chords":
      return { by: o.by };
    case "box": {
      const box = int(o.box, 1, 5);
      return box === null ? null : { by: "box", box };
    }
    case "fret": {
      const fret = int(o.fret, 0, 15);
      return fret === null ? null : { by: "fret", fret };
    }
    case "root":
      return o.string === 6 || o.string === 5 || o.string === 4 ? { by: "root", string: o.string } : null;
  }
  return null;
}
