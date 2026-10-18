import type { CSSProperties, ReactNode } from "react";

/** The landing pages' display face: the soft serif used for big headlines. */
export const DISPLAY: CSSProperties = { fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' };

export function Eyebrow({ children, tone = "text-sky-300" }: { children: ReactNode; tone?: string }) {
  return <p className={`mb-3 text-xs font-medium uppercase tracking-[0.2em] ${tone}`}>{children}</p>;
}

export function H2({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return <h2 id={id} className={`text-3xl leading-[1.08] text-slate-50 text-balance sm:text-5xl ${className}`} style={DISPLAY}>{children}</h2>;
}
