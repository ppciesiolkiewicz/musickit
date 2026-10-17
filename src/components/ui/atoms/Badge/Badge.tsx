import type { ReactNode } from "react";

/** A small read-only label next to a title: "Major", "New", a count. */
export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block rounded-full border border-slate-600 px-1.5 align-middle text-[10px] font-medium uppercase tracking-wider text-slate-300 ${className}`}>{children}</span>;
}
