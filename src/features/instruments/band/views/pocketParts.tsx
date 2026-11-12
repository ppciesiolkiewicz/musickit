"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import usePhone from "@/components/usePhone";
import { inSelectMenu } from "@/components/ui";

/** the look of a pocket line's small square button, and of one switched on, for a host's own line (`lines`) */
export const POCKET_BUTTON = "grid h-7 min-w-7 shrink-0 place-items-center rounded-md border border-slate-700 bg-slate-900 px-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
export const POCKET_LIT = "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100";

/**
 * What the pocket view is doing, for a host to show in its header: the tempo, the drone's note and which parts play;
 * `nextBeat` is when the grid's next beat sounds (AudioContext time), or null when nothing keeps it, for a host to play on the click;
 * `gridBeats` is the beats since the grid's beat 1 (null when nothing keeps it), for a host's bar to ride the click; `restart` starts
 * the grid over on beat 1 shortly (or `from` beats into it), the click with it (muted if it was not playing), and resolves to when it
 * sounds (AudioContext time). `heard` is whether the click sounds; `hear` starts it (if need be) heard, or mutes it, keeping time;
 * `setTempo` sets the tempo for every part.
 */
export type PocketStatus = {
  bpm: number;
  drone: string;
  playing: string[];
  heard: boolean;
  nextBeat: () => number | null;
  gridBeats: () => number | null;
  restart: (from?: number) => Promise<number | null>;
  hear: (on: boolean) => void;
  setTempo: (bpm: number) => void;
};

/** One tool on one line: a small label, then its controls. Exported as `PocketLine` for a host's own lines. */
export function PocketLine({ label, gap = "gap-1", children }: { label: string; gap?: string; children: ReactNode }) {
  return (
    // the label sits level with the first row of controls (h-7, a button's height), also when a slider row follows under them
    <div role="group" aria-label={label} className={`flex min-w-0 items-start ${gap}`}>
      <span className="flex h-7 w-14 shrink-0 items-center text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  );
}

/** Space in a text field types a space; everywhere else it is ours. */
export const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === "INPUT" && !/^(range|checkbox|radio|button)$/.test((el as HTMLInputElement).type)));
};

export function PlayButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${POCKET_BUTTON} ${on ? POCKET_LIT : ""}`} aria-pressed={on} onClick={onClick} title={on ? `Stop the ${label} on the next beat` : `Start the ${label} on the next beat`} aria-label={on ? `Stop the ${label}` : `Play the ${label}`}>
      <Icon name={on ? "square" : "play"} fill size={12} />
    </button>
  );
}

/** A sliders button with a panel under it (a full-screen sheet on a phone); closes on a click outside or Escape. Always the last thing on its line, pushed to the right edge. */
export function Popover({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  const [place, setPlace] = useState<CSSProperties | null>(null);
  // Under the button, right edges aligned, as tall as the screen allows; above it when there is more room there.
  useLayoutEffect(() => {
    if (!open || phone) return;
    const update = () => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 6, edge = 12;
      const below = window.innerHeight - r.bottom - gap - edge;
      const above = r.top - gap - edge;
      const right = Math.max(edge, window.innerWidth - r.right);
      setPlace(below >= 320 || below >= above
        ? { top: r.bottom + gap, right, maxHeight: below }
        : { bottom: window.innerHeight - r.top + gap, right, maxHeight: above });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, phone]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !inSelectMenu(e.target) && !wrap.current?.contains(e.target as Node) && !sheet.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative ml-auto shrink-0">
      <button type="button" className={`${POCKET_BUTTON} ${open ? "!border-sky-400 !text-sky-200" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} title={label} aria-label={label}>
        <Icon name="sliders-horizontal" size={14} />
      </button>
      {open && phone && createPortal(
        // portalled: the settings bar it sits in is blurred, which would trap a fixed panel inside it
        <div ref={sheet} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[2000] overflow-y-auto overscroll-contain bg-slate-950 p-3 text-xs text-slate-300">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-medium text-slate-100">{label}</h2>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Close ✕</button>
          </div>
          {children}
        </div>,
        document.body,
      )}
      {open && !phone && place && createPortal(
        // portalled and fixed: hung off the sticky bar, a tall panel ran past the bottom of the screen where no page scroll could reach it
        <div ref={sheet} role="dialog" aria-label={label} style={place}
          className={`fixed z-[1000] overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl shadow-black/60 ${wide ? "w-xl" : "w-64"} max-w-[calc(100vw-1.5rem)]`}>
          <h2 className="mb-3 text-sm font-medium text-slate-100">{label}</h2>
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
}
