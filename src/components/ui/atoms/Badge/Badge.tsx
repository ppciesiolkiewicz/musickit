import type { ReactNode } from "react";

/** A small read-only label next to a title: "Major", "New", a count. */
export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  // with no colour of its own, the label is chrome
  return <span className={`inline-block rounded-full border border-slate-500/70 px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider text-slate-300 ${className || "metal-text"}`}>{children}</span>;
}
