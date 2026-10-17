import type { ReactNode } from "react";

/** A control with its caption in front of it: "Labels [Note names ▾]". */
export function Field({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      <span className="shrink-0">{label}</span>
      {children}
    </span>
  );
}
