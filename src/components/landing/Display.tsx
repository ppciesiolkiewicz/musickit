import type { CSSProperties, ReactNode } from "react";

/**
 * The landing pages' display face for big headlines: the current music style's headline font (landing-styles.css),
 * falling back to the soft Fraunces serif, which is also what Default and every other page use.
 */
export const DISPLAY: CSSProperties = {
  fontFamily: "var(--style-display, var(--font-display)), serif",
  fontVariationSettings: 'var(--style-display-variation, "SOFT" 100, "opsz" 96)',
  textTransform: "var(--style-display-case, none)" as CSSProperties["textTransform"],
};

export function Eyebrow({ children, tone = "text-sky-300", big = false }: { children: ReactNode; tone?: string; /** larger, bolder, glowing: for the hero label */ big?: boolean }) {
  if (big) {
    return (
      <p className={`mb-4 text-base font-bold uppercase tracking-[0.22em] sm:text-lg ${tone}`} style={{ textShadow: "0 0 18px color-mix(in oklab, currentColor 70%, transparent), 0 0 4px color-mix(in oklab, currentColor 50%, transparent)" }}>
        {children}
      </p>
    );
  }
  return <p className={`ls-metal mb-3 text-xs font-medium uppercase tracking-[0.2em] ${tone}`}>{children}</p>;
}

/**
 * A key phrase in body copy, picked out like a highlighter pen: brighter text over a low band of `tone`. Use one or two per
 * paragraph, on the words a skimming reader should leave with.
 */
export function Mark({ children, tone = "var(--color-sky-400)" }: { children: ReactNode; tone?: string }) {
  return (
    <mark
      className="rounded-[2px] bg-transparent px-0.5 font-medium text-slate-50 [box-decoration-break:clone]"
      style={{ backgroundImage: `linear-gradient(transparent 60%, color-mix(in oklab, ${tone} 38%, transparent) 60%)` }}
    >
      {children}
    </mark>
  );
}

export function H2({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <h2 id={id} className={`text-3xl leading-[1.08] text-slate-50 text-balance sm:text-5xl ${className}`} style={DISPLAY}>{children}</h2>;
}

/** Small "Beta" pill that sits next to a feature's name. */
export function BetaBadge({ className = "" }: { className?: string }) {
  return <span className={`ml-2 inline-block rounded-full border border-sky-400/40 bg-sky-400/10 px-1.5 py-px align-middle text-[10px] font-semibold uppercase leading-4 tracking-wider text-sky-300 ${className}`}>Beta</span>;
}
