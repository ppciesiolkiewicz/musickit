import type { CSSProperties } from "react";

/** The ring colours, from the app's tool colours: sky (autoplan), violet (voice), teal (notes), amber (guitar), rose. */
const C = { sky: "#38bdf8", violet: "#a78bfa", teal: "#2dd4bf", amber: "#fbbf24", rose: "#fb7185" } as const;
type Colour = keyof typeof C;

/**
 * One glass shape: where it sits (Tailwind classes; `top` in % of the page), its two ring colours and its depth `d`.
 * A deeper shape (higher `d`) slides further as the page scrolls, so it reads as nearer. Small shapes are the near ones.
 */
type Shape = { at: string; round?: boolean; ring: [Colour, Colour]; d: number; glyph?: Glyph };
type Glow = { at: string; colour: Colour; d: number };
type Dots = { at: string; d: number };

/**
 * Down the whole page, alternating sides: big shapes half off the edge, small ones closer in. Rounds hold a ring; most squares
 * hold a music sign (a note, a sharp, a flat, a chord box, a pick).
 */
const SHAPES: Shape[] = [
  { at: "-right-24 top-[1%] size-56 rotate-6 rounded-[2rem]", ring: ["sky", "violet"], d: 14, glyph: "chord" },
  { at: "right-10 top-[9%] size-12", round: true, ring: ["amber", "rose"], d: 40 },
  { at: "-left-20 top-[5%] size-40", round: true, ring: ["teal", "sky"], d: 20 },
  { at: "left-8 top-[13%] size-16 -rotate-12 rounded-xl", ring: ["violet", "amber"], d: 36, glyph: "quaver" },
  { at: "-left-24 top-[22%] size-44 rotate-6 rounded-[2rem]", ring: ["sky", "violet"], d: 18, glyph: "sharp" },
  { at: "left-6 top-[33%] size-14", round: true, ring: ["teal", "amber"], d: 44 },
  { at: "-right-32 top-[20%] size-64", round: true, ring: ["violet", "teal"], d: 12 },
  { at: "-right-10 top-[34%] size-24 rotate-12 rounded-2xl", ring: ["rose", "amber"], d: 32, glyph: "beamed" },
  { at: "-left-16 top-[44%] size-36 -rotate-12 rounded-[1.75rem]", ring: ["amber", "rose"], d: 22, glyph: "flat" },
  { at: "right-8 top-[46%] size-10", round: true, ring: ["sky", "violet"], d: 48 },
  { at: "-right-20 top-[54%] size-48 rotate-6 rounded-[2rem]", ring: ["teal", "sky"], d: 16, glyph: "pick" },
  { at: "-left-20 top-[62%] size-40 -rotate-6", round: true, ring: ["teal", "sky"], d: 20 },
  { at: "left-10 top-[72%] size-12 rotate-12 rounded-xl", ring: ["violet", "rose"], d: 42, glyph: "quaver" },
  { at: "-right-24 top-[70%] size-52 rotate-12 rounded-[2rem]", ring: ["amber", "violet"], d: 14, glyph: "beamed" },
  { at: "-right-6 top-[82%] size-20", round: true, ring: ["sky", "teal"], d: 34 },
  { at: "-left-24 top-[84%] size-48 rotate-6 rounded-[2rem]", ring: ["rose", "violet"], d: 18, glyph: "sharp" },
];

const GLOWS: Glow[] = [
  { at: "-right-24 top-[2%] size-96", colour: "violet", d: 8 },
  { at: "-left-20 top-[20%] size-96", colour: "sky", d: 10 },
  { at: "-right-24 top-[45%] size-96", colour: "teal", d: 8 },
  { at: "-left-16 top-[68%] size-80", colour: "violet", d: 10 },
  { at: "-right-20 top-[80%] size-80", colour: "sky", d: 8 },
];

/** Fewer, bigger patches than shapes: one high on each side by the video, then down the page between the shapes. */
const DOTS: Dots[] = [
  { at: "left-0 top-[6%] h-64 w-64", d: 6 },
  { at: "right-0 top-[12%] h-56 w-56", d: 8 },
  { at: "left-2 top-[28%] h-48 w-48", d: 6 },
  { at: "right-4 top-[38%] h-60 w-52", d: 6 },
  { at: "left-4 top-[55%] h-56 w-56", d: 8 },
  { at: "right-2 top-[66%] h-48 w-48", d: 6 },
  { at: "right-0 top-[88%] h-52 w-56", d: 6 },
];

/** A music sign glowing inside a square shape, in place of its ring. */
type Glyph = "quaver" | "beamed" | "sharp" | "flat" | "chord" | "pick";

/** Each sign on a 48 × 48 grid: `fill` parts take the ring's gradient, `line` parts are stroked with it. */
const GLYPHS: Record<Glyph, { fill?: string; line?: string; dots?: [number, number][] }> = {
  // a head, its stem and one flag
  quaver: { fill: "M11.5 35.5c0-3.6 4-6.5 8.2-6.5 2 0 3.3.6 4.3 1.6V7h3c.6 4.8 3.4 7.4 6 9.8 2.4 2.3 4.3 4.6 4.3 8.6 0 1.8-.4 3.6-1.2 5.3.2-1-.1-2.6-.6-3.8-1.3-3.4-4.7-5.4-8.5-6.2v15.6c0 3.7-4 6.7-8.3 6.7-4 0-7.2-2-7.2-5.5Z" },
  // two heads joined by a beam
  beamed: { fill: "M6 37.5c0-3 3.4-5.4 7-5.4 1.4 0 2.6.4 3.5 1V13.6L40 8v25.6c0 3-3.4 5.4-7 5.4s-6-2-6-4.6c0-3 3.4-5.4 7-5.4 1.4 0 2.6.4 3.5 1V17.2L19 21.6v16.8c0 3-3.4 5.4-7 5.4-3.6 0-6-2-6-4.6Z" },
  sharp: { fill: "M11 21.6 37 15v5.6l-26 6.6Zm0 11.6 26-6.6v5.6l-26 6.6Z", line: "M19 8v36M29 5.5v36" },
  flat: { line: "M16 5v38c6-3.4 13.6-8.4 15.4-13.4 1.3-3.8-1-6.6-4.6-6.6-3.6 0-7.6 2.4-10.8 6" },
  // a chord box: the nut, four frets, six strings and three fingers (a C chord)
  chord: { line: "M10 10h28M10 19h28M10 28h28M10 37h28M10 44h28M10 10v34M15.6 10v34M21.2 10v34M26.8 10v34M32.4 10v34M38 10v34", fill: "M10 8h28v3.5H10Z", dots: [[15.6, 32.5], [21.2, 23.5], [32.4, 14.5]] },
  // a guitar pick
  pick: { line: "M24 43c-6-7-15-19-14.4-28.6C10 8.6 17 6 24 6s14 2.6 14.4 8.4C39 24 30 36 24 43Z" },
};

/** The sign inside a shape, filled and stroked with a gradient from the ring's first colour to its second. */
function GlyphMark({ glyph, id, ring }: { glyph: Glyph; id: string; ring: [Colour, Colour] }) {
  const g = GLYPHS[glyph];
  const paint = `url(#${id})`;
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`color-mix(in oklab, ${C[ring[0]]} 55%, white)`} />
          <stop offset="0.45" stopColor={C[ring[0]]} />
          <stop offset="1" stopColor={C[ring[1]]} />
        </linearGradient>
      </defs>
      {g.line && <path d={g.line} fill="none" stroke={paint} strokeWidth={glyph === "chord" ? 1.4 : 2.6} strokeLinecap="round" strokeLinejoin="round" />}
      {g.fill && <path d={g.fill} fill={paint} />}
      {g.dots?.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={paint} />)}
    </svg>
  );
}

const depth = (d: number) => ({ "--d": d }) as CSSProperties;

/**
 * Glass shapes behind a whole page, in the spare room either side of the content, sliding at their own depths as it
 * scrolls. Pass it as PageShell's `decor`. Decoration only: hidden from screen readers, never in the way of a click, still
 * for anyone who asks for less motion, and hidden on phones, where there is no room beside the content.
 */
export default function GlassShapes() {
  return (
    <div aria-hidden="true" className="glass-field hidden sm:block">
      {GLOWS.map((g) => <div key={g.at} className={`glass-glow ${g.at}`} style={{ ...depth(g.d), background: C[g.colour] }} />)}
      {DOTS.map((d) => <div key={d.at} className={`glass-dots ${d.at}`} style={depth(d.d)} />)}
      {SHAPES.map((s, i) => {
        // the ring or sign moves a little inside its glass, a quarter of the shape's depth
        const inner = { ...depth(Math.round(s.d / 4)), "--inlay": C[s.ring[0]], "--inlay-2": C[s.ring[1]] } as CSSProperties;
        return (
          <div key={s.at} className={`glass-shape ${s.at} ${s.round ? "rounded-full" : ""}`} style={depth(s.d)}>
            {s.glyph ? (
              // a shape half off the page edge holds its sign on the side that shows
              <div className="glass-glyph" style={{ ...inner, inset: s.at.startsWith("-left") ? "20% 6% 20% 34%" : s.at.startsWith("-right") ? "20% 34% 20% 6%" : undefined }}><GlyphMark glyph={s.glyph} id={`glass-glyph-${i}`} ring={s.ring} /></div>
            ) : (
              <div className="glass-inlay" style={inner} />
            )}
          </div>
        );
      })}
    </div>
  );
}
