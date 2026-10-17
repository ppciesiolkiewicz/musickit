import type { ReactNode } from "react";

/** The panel an (i) opens: a full-width note under its row. */
export function InfoBox({ children }: { children: ReactNode }) {
  return <div className="basis-full rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs normal-case leading-relaxed tracking-normal text-slate-300">{children}</div>;
}
