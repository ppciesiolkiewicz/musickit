import type { ReactNode } from "react";

/**
 * A small note that pops up next to its child while `open`, e.g. "Link copied" beside a share button. It does not take
 * clicks or focus; the caller decides when it shows and hides. `side` "corner" is for a button in a title row's right
 * corner: on a narrow screen the note sits over the child, lined up with its right edge (beside it, it would cover the
 * title; under it, the first line of the intro), and to its left from `sm` up.
 */
export function Popover({ open, content, side = "top", children }: { open: boolean; content: ReactNode; side?: "top" | "bottom" | "left" | "right" | "corner"; children: ReactNode }) {
  const place = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
    corner: "bottom-full right-0 mb-1.5 sm:bottom-auto sm:top-1/2 sm:right-full sm:mb-0 sm:mr-1.5 sm:-translate-y-1/2",
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
