import type { CSSProperties } from "react";

/** The ring colours, from the app's tool colours: sky (autoplan), violet (voice), teal (notes), amber (guitar), rose. */
const C = { sky: "#38bdf8", violet: "#a78bfa", teal: "#2dd4bf", amber: "#fbbf24", rose: "#fb7185" } as const;
type Colour = keyof typeof C;

/**
 * One glass shape: where it sits (Tailwind classes; `top` in % of the page), its two ring colours and its depth `d`.
 * A deeper shape (higher `d`) slides further as the page scrolls, so it reads as nearer. Small shapes are the near ones.
 */
type Shape = { at: string; round?: boolean; ring: [Colour, Colour]; d: number };
type Glow = { at: string; colour: Colour; d: number };
type Dots = { at: string; d: number };

/** Down the whole page, alternating sides: big shapes half off the edge, small ones closer in. */
const SHAPES: Shape[] = [
  { at: "-right-24 top-[1%] size-56 rotate-6 rounded-[2rem]", ring: ["sky", "violet"], d: 14 },
  { at: "right-10 top-[9%] size-12", round: true, ring: ["amber", "rose"], d: 40 },
  { at: "-left-20 top-[5%] size-40", round: true, ring: ["teal", "sky"], d: 20 },
  { at: "left-8 top-[13%] size-16 -rotate-12 rounded-xl", ring: ["violet", "amber"], d: 36 },
  { at: "-left-24 top-[22%] size-44 rotate-6 rounded-[2rem]", ring: ["sky", "violet"], d: 18 },
  { at: "left-6 top-[33%] size-14", round: true, ring: ["teal", "amber"], d: 44 },
  { at: "-right-32 top-[20%] size-64", round: true, ring: ["violet", "teal"], d: 12 },
  { at: "-right-10 top-[34%] size-24 rotate-12 rounded-2xl", ring: ["rose", "amber"], d: 32 },
  { at: "-left-16 top-[44%] size-36 -rotate-12 rounded-[1.75rem]", ring: ["amber", "rose"], d: 22 },
  { at: "right-8 top-[46%] size-10", round: true, ring: ["sky", "violet"], d: 48 },
  { at: "-right-20 top-[54%] size-48 rotate-6 rounded-[2rem]", ring: ["teal", "sky"], d: 16 },
  { at: "-left-20 top-[62%] size-40 -rotate-6", round: true, ring: ["teal", "sky"], d: 20 },
  { at: "left-10 top-[72%] size-12 rotate-12 rounded-xl", ring: ["violet", "rose"], d: 42 },
  { at: "-right-24 top-[70%] size-52 rotate-12 rounded-[2rem]", ring: ["amber", "violet"], d: 14 },
  { at: "-right-6 top-[82%] size-20", round: true, ring: ["sky", "teal"], d: 34 },
  { at: "-left-24 top-[84%] size-48 rotate-6 rounded-[2rem]", ring: ["rose", "violet"], d: 18 },
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
      {SHAPES.map((s) => (
        <div key={s.at} className={`glass-shape ${s.at} ${s.round ? "rounded-full" : ""}`} style={depth(s.d)}>
          {/* the ring moves a little inside its glass, a quarter of the shape's depth */}
          <div className="glass-inlay" style={{ ...depth(Math.round(s.d / 4)), "--inlay": C[s.ring[0]], "--inlay-2": C[s.ring[1]] } as CSSProperties} />
        </div>
      ))}
    </div>
  );
}
