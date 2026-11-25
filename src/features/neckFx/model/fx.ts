import { distOf, fretAt, type Grid, type Pt } from "./grid";

/**
 * Effects drawn over the neck, for testing: what each one is, where a fret is on the screen, a grid steadied over frames,
 * markers used as buttons (covered = pressed), and the filters those buttons switch. Pure: NeckView draws.
 */

export const EFFECTS = ["markers", "frets", "glow", "flash", "pulse", "trails"] as const;
export type Effect = (typeof EFFECTS)[number];
export const EFFECT_WORDS: Record<Effect, string> = {
  markers: "Markers and hands",
  frets: "Fret lines",
  glow: "Hand glow",
  flash: "Note flash",
  pulse: "Pick pulse",
  trails: "Fingertip trails",
};

export const FILTERS = ["mono", "neon", "warm", "cold", "invert", "blur"] as const;
export type Filter = (typeof FILTERS)[number];
/** CSS filter for the video under the effects. */
export const FILTER_CSS: Record<Filter, string> = {
  mono: "grayscale(1) contrast(1.2)",
  neon: "saturate(2.2) contrast(1.15) brightness(1.05)",
  warm: "sepia(0.45) saturate(1.5) hue-rotate(-12deg)",
  cold: "saturate(1.2) hue-rotate(185deg) brightness(0.95)",
  invert: "invert(1)",
  blur: "blur(6px)",
};

export interface FxSettings {
  /** "id@fret, …": see `parsePlaced` */
  markers: string;
  /** "id=filter, …": covering that marker turns the filter on */
  buttons: string;
  /** hold: on while covered; toggle: each cover flips it */
  mode: "hold" | "toggle";
  effects: Effect[];
}
/**
 * The layout on the test guitar (a Strat), from the fret sheet (`public/riff/neck-markers-frets-a3.pdf`): 30 mm on the
 * headstock just past the nut (the truss-rod nut between them), one marker in each of fret spaces 1, 3, 5, 7 and 9, 40 mm on
 * the body above the neck, level with fret 19, and two 40 mm buttons under the picking hand. `fret` is the fret space (0 is
 * the nut); `mm` is the black square's side, as printed under the marker; `gap` how far a headstock marker's near edge is
 * past the nut, in mm.
 */
export const A3_LAYOUT: { id: number; mm: number; fret: number | null; gap?: number; where: string; filter?: Filter }[] = [
  { id: 56, mm: 30, fret: 0, gap: 8, where: "headstock, its edge about 8 mm past the nut, beyond the truss-rod nut" },
  { id: 62, mm: 24, fret: 1, where: "fret 1" },
  { id: 70, mm: 24, fret: 3, where: "fret 3, by the dot" },
  { id: 87, mm: 20, fret: 5, where: "fret 5, by the dot" },
  { id: 97, mm: 18, fret: 7, where: "fret 7, by the dot" },
  { id: 107, mm: 16, fret: 9, where: "fret 9, by the dot" },
  { id: 51, mm: 40, fret: 19, where: "body above the neck, level with fret 19" },
  { id: 52, mm: 40, fret: null, where: "body, under your picking hand", filter: "mono" },
  { id: 53, mm: 40, fret: null, where: "body, under your picking hand", filter: "neon" },
];
export const A3_MARKERS = A3_LAYOUT.flatMap((m) => (m.fret === null ? [] : [`${m.id}@${m.fret}${m.fret === 0 ? `/${m.mm}${m.gap ? `+${m.gap}` : ""}` : ""}`])).join(", ");
export const A3_BUTTONS = A3_LAYOUT.flatMap((m) => (m.filter ? [`${m.id}=${m.filter}`] : [])).join(", ");

export const DEFAULT_FX: FxSettings = { markers: A3_MARKERS, buttons: A3_BUTTONS, mode: "hold", effects: ["markers", "frets"] };

/** Settings read back from storage: anything unreadable falls back to the default. */
export function readFx(v: unknown): FxSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof FxSettings, unknown>>;
  return {
    markers: typeof o.markers === "string" ? o.markers : DEFAULT_FX.markers,
    buttons: typeof o.buttons === "string" ? o.buttons : DEFAULT_FX.buttons,
    mode: o.mode === "toggle" ? "toggle" : "hold",
    effects: Array.isArray(o.effects) ? EFFECTS.filter((e) => (o.effects as unknown[]).includes(e)) : DEFAULT_FX.effects,
  };
}

/** "56=mono, 57=neon" → marker 56 turns on Mono, 57 Neon. Unreadable parts are skipped. */
export function parseButtons(text: string): { id: number; filter: Filter }[] {
  return text.split(/[,\s]+/).flatMap((p) => {
    const m = /^(\d+)=([a-z]+)$/i.exec(p.trim());
    const f = m?.[2].toLowerCase() as Filter | undefined;
    return m && f && FILTERS.includes(f) ? [{ id: Number(m[1]), filter: f }] : [];
  });
}

/** Where on the neck's axis a fret wire is (fret 0 the nut), in frame units. */
export function wireAt(g: Grid, fret: number): Pt {
  const s = (distOf(fret) - g.b) / g.a;
  return { x: g.origin.x + g.dir.x * s, y: g.origin.y + g.dir.y * s };
}
/** The middle of fret space `fret` (between wires fret − 1 and fret), in frame units. */
export function spaceAt(g: Grid, fret: number): Pt {
  const s = ((distOf(fret - 1) + distOf(fret)) / 2 - g.b) / g.a;
  return { x: g.origin.x + g.dir.x * s, y: g.origin.y + g.dir.y * s };
}
/** Across the neck, a unit vector. */
export const across = (g: Grid): Pt => ({ x: -g.dir.y, y: g.dir.x });

/** A grid eased toward the newest one, so effects don't shake: `k` of the way per frame (1 = no easing). */
export function easeGrid(prev: Grid | null, next: Grid, k = 0.35): Grid {
  if (!prev) return next;
  // the same axis read either way round would flip the direction: keep the old sense
  const flip = prev.dir.x * next.dir.x + prev.dir.y * next.dir.y < 0;
  const n = flip ? { ...next, dir: { x: -next.dir.x, y: -next.dir.y }, a: -next.a } : next;
  // compare where the two put the nut and fret 12, and ease those: origin and scale move together
  const ends = (g: Grid) => [wireAt(g, 0), wireAt(g, 12)];
  const [p0, p12] = ends(prev), [n0, n12] = ends(n);
  const mix = (a: Pt, b: Pt) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  return gridThrough(mix(p0, n0), mix(p12, n12));
}
/** The grid with the nut at `nut` and wire 12 at `twelve`. */
export function gridThrough(nut: Pt, twelve: Pt): Grid {
  const dx = twelve.x - nut.x, dy = twelve.y - nut.y, len = Math.hypot(dx, dy) || 1e-9;
  return { origin: nut, dir: { x: dx / len, y: dy / len }, a: distOf(12) / len, b: 0 };
}

/**
 * Which watched markers are covered now: each was seen, then went missing for `holdS` while another marker stayed in view.
 * `last` is when each id was last seen; it is updated in place. Markers never seen are never covered.
 */
export function coveredNow(last: Map<number, number>, seen: number[], t: number, watch: number[], holdS = 0.2): number[] {
  for (const id of seen) last.set(id, t);
  if (!seen.length) return [];
  return watch.filter((id) => last.has(id) && !seen.includes(id) && t - last.get(id)! >= holdS);
}

/**
 * The filters on, from what is covered now and what was covered the frame before. Hold: on while covered. Toggle: a cover
 * that starts flips its filter, kept in `on`.
 */
export function filtersOn(buttons: { id: number; filter: Filter }[], covered: number[], before: number[], mode: FxSettings["mode"], on: Set<Filter>): Filter[] {
  if (mode === "hold") return buttons.filter((b) => covered.includes(b.id)).map((b) => b.filter);
  for (const b of buttons) {
    if (!covered.includes(b.id) || before.includes(b.id)) continue;
    if (on.has(b.filter)) on.delete(b.filter);
    else on.add(b.filter);
  }
  return [...on];
}

/** A colour for each of the 12 notes, C red round the wheel. */
export const noteHue = (midi: number) => (((midi % 12) + 12) % 12) * 30;
export const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];
export const midiOfHz = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));

/** The fretting hand's fingertips as frets: of each hand's tips (not the thumb), the hand with most on the neck. */
export function frettingTips(g: Grid, hands: Pt[][]): { tips: Pt[]; frets: number[] } | null {
  const on = hands.map((tips) => {
    const kept = tips.slice(1).map((p) => ({ p, f: fretAt(g, p) })).filter((x) => x.f > -0.5 && x.f < 22);
    return { tips: kept.map((x) => x.p), frets: kept.map((x) => x.f) };
  });
  const best = on.sort((a, b) => b.frets.length - a.frets.length)[0];
  return best?.frets.length ? best : null;
}
