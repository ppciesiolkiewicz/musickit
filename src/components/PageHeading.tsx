import type { ReactNode } from "react";
import { sectionFor, type Tone } from "@/features/theory/sections";

/** The short rule under the title, in the page's own colour (full class names so Tailwind sees them). */
const BAR: Record<Tone, string> = { emerald: "bg-emerald-400", sky: "bg-sky-400", amber: "bg-amber-400", violet: "bg-violet-400", rose: "bg-rose-400", teal: "bg-teal-400", pink: "bg-pink-400", red: "bg-red-400" };
/** The rule's class for the page at `active` (its nav address): its section's colour, sky when it has none. */
export const pageBar = (active: string): string => { const s = sectionFor(active); return s ? BAR[s.tone] : "bg-sky-400"; };

/**
 * A page's title as every page draws it: an optional line over it saying what kind of page this is, the title in the display face
 * and the short rule under it in the page's colour (`bar`, a full Tailwind class). On its own, apart from `PageShell`, so a
 * client component can draw the same heading (a note whose title can change in the browser).
 */
export function PageHeading({ title, eyebrow, bar = "bg-sky-400" }: { title: ReactNode; eyebrow?: string; bar?: string }) {
  return (
    <>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>}
      <h1 className="text-3xl leading-tight text-slate-50 text-balance sm:text-4xl" style={{ fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' }}>{title}</h1>
      <span aria-hidden className={`mt-3 block h-0.5 w-12 rounded-full ${bar}`} />
    </>
  );
}

/** The line about the page, under its heading. */
export function PageIntro({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">{children}</p>;
}

/** A heading with something in its right corner (a button, the guide's help): they share a row and wrap on a narrow screen. */
export function PageHeadingRow({ heading, corner }: { heading: ReactNode; corner: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div>{heading}</div>
      <div className="flex items-center gap-2">{corner}</div>
    </div>
  );
}
