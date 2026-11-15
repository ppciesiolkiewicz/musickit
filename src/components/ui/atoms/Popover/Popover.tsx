import type { ReactNode } from "react";

/**
 * A small note that pops up next to its child while `open`, e.g. "Link copied" beside a share button. It does not take
 * clicks or focus; the caller decides when it shows and hides. `side` "below-left" sits under the child, lined up with
 * its right edge, on a narrow screen and to its left from `sm` up (for a button in a title row's right corner, where the
 * note would cover the title on a phone).
 */
export function Popover({ open, content, side = "top", children }: { open: boolean; content: ReactNode; side?: "top" | "bottom" | "left" | "right" | "below-left"; children: ReactNode }) {
  const place = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
    "below-left": "top-full right-0 mt-1.5 sm:top-1/2 sm:right-full sm:mt-0 sm:mr-1.5 sm:-translate-y-1/2",
  }[side];
  return (
    <span className="relative inline-flex">
      {children}
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-lg transition-opacity duration-150 ${place} ${open ? "opacity-100" : "opacity-0"}`}
      >
        {open ? content : null}
      </span>
    </span>
  );
}
