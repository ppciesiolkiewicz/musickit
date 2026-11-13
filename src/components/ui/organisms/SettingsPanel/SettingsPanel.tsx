"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PHONE_QUERY } from "@/components/usePhone";
import { PlaceToggle } from "./PlaceToggle";
import { TOUR_REVEAL } from "../Tour";

/** Room the sticky panel takes at the top, for `scroll-mt` on sections linked to by #hash. */
export const UNDER_PANEL = "scroll-mt-48";

/** The panel as a side column: flush to the window's right edge and as tall as the window, scrolling on its own. */
const SIDE = "lg:mx-0 side:static side:mx-0 side:h-dvh side:overflow-y-auto side:rounded-none side:border-y-0 side:border-r-0 side:px-4 side:py-4 side:shadow-none";

/**
 * A page with its settings. Layout only: what is in it is the page's (`settings`, composed from `SettingsRow`s and
 * `SettingsSection`s, and the tool sections beside them, `tools`).
 *
 * With `side` (the default), on wide screens the panel is a column pinned to the right edge of the window, beside the
 * page; the player can move it above the page with the panel-position button (one choice for the whole app, `place.ts`;
 * the `side:` variant in globals.css does the layout, so nothing flashes). Above the page, or below `lg`, or with
 * `side={false}` (a page embedded in another, such as a tool in the plan) it is a bar that floats over the top while the
 * page scrolls; on a phone it folds itself away the first time the page is scrolled down.
 *
 * The body renders once whatever the layout, so tools in it keep playing when it moves. `criteria`: rows that pick what
 * the page shows (a triad's quality, the strings), in a box at the top of the page beside a side panel, at the end of
 * the settings in an embedded one. `name` is the headline beside "Settings" (the key and scale); `summary` the other
 * settings at a glance (`SettingsFact`s), shown while the panel is a bar.
 */
export function SettingsPanel({ settings, tools, name, summary, criteria, side = true, tour, foldOnPhone = false, children }: {
  settings: ReactNode;
  tools?: ReactNode;
  name?: ReactNode;
  summary?: ReactNode;
  criteria?: ReactNode;
  side?: boolean;
  tour?: string;
  /** start folded on a phone, so the page's tool comes first (the tuner's meter) */
  foldOnPhone?: boolean;
  children: ReactNode;
}) {
  const panel = <Panel settings={side ? settings : <>{settings}{criteria}</>} tools={tools} name={name} summary={summary} side={side} tour={tour} foldOnPhone={foldOnPhone} />;
  if (!side) return <div className="flex flex-col gap-5">{panel}{children}</div>;
  return (
    // reaches out over PageShell's right padding so the column sits flush with the window
    <div data-with-settings className="flex flex-col gap-5 side:-mr-8 side:grid side:grid-cols-[minmax(0,1fr)_22rem] side:items-start side:gap-x-8">
      <div className="contents side:col-start-2 side:row-start-1 side:block side:sticky side:top-0">{panel}</div>
      {/* necks that bleed past a centred page would run under the column, so they stay in it here */}
      <div className="flex min-w-0 flex-col gap-5 side:col-start-1 side:row-start-1 side:[&_.bleed]:mx-0">
        {criteria && <div data-tour="scale-criteria" className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">{criteria}</div>}
        {children}
      </div>
    </div>
  );
}

function Panel({ settings, tools, name, summary, side, tour, foldOnPhone }: { settings: ReactNode; tools?: ReactNode; name?: ReactNode; summary?: ReactNode; side: boolean; tour?: string; foldOnPhone: boolean }) {
  const [open, setOpen] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  // true until the panel has folded itself once or been toggled by hand
  const autoFold = useRef(true);
  useEffect(() => {
    // phones only (either way up): wider screens have room to keep it open
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    if (foldOnPhone) {
      autoFold.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- folding once the phone check can run, after hydration
      setOpen(false);
      return;
    }
    const start = window.scrollY;
    const onScroll = () => {
      if (!autoFold.current) return;
      if (window.scrollY - start > 80) {
        autoFold.current = false;
        setOpen(false);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [foldOnPhone]);
  // a tour step inside the folded body opens it, and it stays open (no auto-fold after)
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const onReveal = () => {
      autoFold.current = false;
      setOpen(true);
    };
    node.addEventListener(TOUR_REVEAL, onReveal);
    return () => node.removeEventListener(TOUR_REVEAL, onReveal);
  }, []);
  const toggle = () => {
    autoFold.current = false;
    setOpen((v) => !v);
  };
  return (
    // breaks out of the page column to span the window, less a small gutter each side; as a side column it fills the window's height
    <div ref={root} data-tour={tour ?? "settings"} className={`sticky top-2 z-20 mx-[calc(50%-50vw+0.5rem)] flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-2.5 shadow-lg sm:px-6 sm:py-3 shadow-black/30 backdrop-blur ${side ? SIDE : ""}`}>
      {/* a rule under the header while the settings show, to set it apart from them */}
      <div className={`flex items-center gap-2 ${open ? "border-b border-slate-800 pb-2.5 sm:pb-3" : ""} ${side ? "side:border-b side:border-slate-800 side:pb-3" : ""}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={`group flex min-w-0 flex-1 items-center gap-2 rounded-md text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${side ? "side:pointer-events-none" : ""}`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-100">Settings</span>
          {name && <span className="shrink-0 truncate text-sm font-medium text-slate-100">{name}</span>}
          {/* the rest of the settings at a glance, as room allows */}
          <span className={`flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap text-slate-400 ${side ? "side:invisible" : ""}`}>{summary}</span>
          <span className={`flex shrink-0 items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 transition group-hover:border-sky-400 group-hover:text-sky-200 ${side ? "side:hidden" : ""}`}>
            {open ? "Hide" : "Show"}
            <svg viewBox="0 0 12 12" aria-hidden className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {side && <PlaceToggle />}
      </div>
      {/* hidden rather than unmounted, so tools in it keep playing while it is folded */}
      <div className={`${open ? "flex" : "hidden"} max-h-[70vh] flex-col gap-5 overflow-y-auto sm:max-h-none sm:overflow-visible xl:flex-row xl:items-center xl:gap-6 ${side ? "side:flex side:flex-col side:items-stretch side:gap-5" : ""}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-5">{settings}</div>
        {tools}
      </div>
    </div>
  );
}
