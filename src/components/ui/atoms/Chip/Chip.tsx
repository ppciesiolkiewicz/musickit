import type { ReactNode } from "react";
import { hueClass, type Hue } from "../Hue";

/**
 * A toggle pill: one option of a row (pressed when `on`), with an optional count. `hue` colour codes it among many.
 * `onHover` hears a mouse moving on and off it (never a finger), for previews.
 */
export function Chip({ on, onClick, onHover, children, count, title, hue }: { on?: boolean; onClick?: () => void; onHover?: (hovering: boolean) => void; children: ReactNode; count?: number; title?: string; hue?: Hue }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onHover && ((e) => e.pointerType === "mouse" && onHover(true))}
      onPointerLeave={onHover && ((e) => e.pointerType === "mouse" && onHover(false))}
      title={title}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
        hue ? hueClass(hue, !!on) : on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
      {count !== undefined && <span className="tabular-nums text-[10px] text-slate-500">{count}</span>}
    </button>
  );
}
