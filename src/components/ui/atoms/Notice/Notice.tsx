import type { ReactNode } from "react";

const TONE = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;

/** A small framed alert for a heads-up that belongs to the page, not to one control: an icon in a tinted badge and one or two lines. */
export function Notice({ icon, tone = "info", children }: { icon: ReactNode; tone?: keyof typeof TONE; children: ReactNode }) {
  return (
    <div role="note" className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm leading-snug text-slate-300 ${TONE[tone]}`}>
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950/50">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
