import type { ReactNode } from "react";

/**
 * A small note that pops up next to its child while `open`, e.g. "Link copied" beside a share button. It does not take
 * clicks or focus; the caller decides when it shows and hides.
 */
export function Popover({ open, content, side = "top", children }: { open: boolean; content: ReactNode; side?: "top" | "bottom" | "left" | "right"; children: ReactNode }) {
  const place = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
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
