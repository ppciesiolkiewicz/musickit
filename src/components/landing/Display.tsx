import type { CSSProperties, ReactNode } from "react";

/**
 * The landing pages' display face for big headlines: the current music style's headline font (landing-styles.css),
 * falling back to the soft Fraunces serif, which is also what Plain and every other page use.
 */
export const DISPLAY: CSSProperties = {
  fontFamily: "var(--style-display, var(--font-display)), serif",
  fontVariationSettings: 'var(--style-display-variation, "SOFT" 100, "opsz" 96)',
  textTransform: "var(--style-display-case, none)" as CSSProperties["textTransform"],
};

export function Eyebrow({ children, tone = "text-sky-300" }: { children: ReactNode; tone?: string }) {
  return <p className={`mb-3 text-xs font-medium uppercase tracking-[0.2em] ${tone}`}>{children}</p>;
}

export function H2({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <h2 id={id} className={`text-3xl leading-[1.08] text-slate-50 text-balance sm:text-5xl ${className}`} style={DISPLAY}>{children}</h2>;
}
