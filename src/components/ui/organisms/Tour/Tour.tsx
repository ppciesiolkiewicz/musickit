"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../atoms/Button";
import { EscKey, useEscape } from "../../atoms/EscKey";

/** One stop of a tour: `target` is the `data-tour` name of the section to light up. */
export interface TourStep {
  target: string;
  title: string;
  text: string;
}

/** The card's widest size; on a phone it shrinks to the window less its margins. */
const WIDTH = 288;
/** Space between the lit section and the card. */
const GAP = 10;
/** Margin kept between the card (and the scroll target) and the window's edge. */
const EDGE = 10;
/** How far the lit outline stands off the section itself. */
const PAD = 6;

/** The small [space] label on Next, saying the space bar does the same. */
function SpaceKey() {
  return (
    <kbd aria-hidden className="shrink-0 rounded border border-sky-400/50 px-1 text-[9px] font-medium normal-case tracking-normal text-sky-200">
      space
    </kbd>
  );
}

const subscribeNever = () => () => {};

type Rect ={ top: number; left: number; width: number; height: number };
type Place = { top: number; left: number; width: number };

function findTarget(root: ParentNode | undefined, target: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = (root ?? document).querySelector(`[data-tour="${CSS.escape(target)}"]`);
  return el instanceof HTMLElement ? el : null;
}

/**
 * A spotlight walk through a page's sections. While `open`, the page dims except for one section (found by its
 * `data-tour="<target>"` attribute, inside `root` when given), outlined, with a small card beside it: the step's title
 * and text, dots for progress, and Back / Next (Done on the last step; Space does the same) / Skip. Escape and Skip call `onClose(false)`,
 * Done calls `onClose(true)`. Each step scrolls its section into view (its top, when it is taller than the window), and
 * the outline and card follow it on scroll and resize; the card stays inside the window like `Hint`'s. Steps whose
 * section is not on the page when the tour opens are left out; if none is there the tour closes at once. Clicks on the
 * dimmed page are swallowed so a stray tap does not change it mid-tour; nothing locks scrolling.
 */
export function Tour({ steps, root, open, onClose }: { steps: TourStep[]; root?: ParentNode; open: boolean; onClose: (finished: boolean) => void }) {
  // drawn on the page itself (not inside a transformed widget), and only after mount so server and client agree
  const host = useSyncExternalStore(subscribeNever, () => document.body, () => null);

  // the steps whose section exists, fixed when the tour opens so the dots do not jump around
  const [shown, setShown] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  // latest props, read when the tour opens: callers may pass a fresh `steps` array every render, which must not restart it
  const latest = useRef({ onClose, steps, root });
  useLayoutEffect(() => {
    latest.current = { onClose, steps, root };
  });
  useLayoutEffect(() => {
    // the sections are only in the DOM after commit (they may mount together with an already-open tour), so this
    // can't be worked out during render
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the page's sections once they are mounted
    setI(0);
    if (!open) {
      setShown(null);
      return;
    }
    const present = latest.current.steps.filter((s) => findTarget(latest.current.root, s.target));
    setShown(present);
    if (!present.length) latest.current.onClose(false);
  }, [open]);

  const step = shown?.[Math.min(i, shown.length - 1)];
  const last = !!shown && i >= shown.length - 1;
  const close = (finished: boolean) => latest.current.onClose(finished);
  useEscape(open && !!step, () => close(false));
  // Space is Next (Done on the last step); caught first so the page's own Space shortcuts stay quiet mid-tour
  const advance = useRef(() => {});
  useLayoutEffect(() => {
    advance.current = () => (last ? close(true) : setI((n) => n + 1));
  });
  const active = open && !!step;
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      advance.current();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [active]);

  const card = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    // nothing is drawn without a step; the next step measures afresh before it paints
    if (!step) return;
    let el = findTarget(root, step.target);
    const update = () => {
      // the section may have been re-rendered (a new node) or removed since the step began
      if (!el?.isConnected) el = findTarget(root, step.target);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(WIDTH, vw - 2 * EDGE);
      const h = card.current?.offsetHeight ?? 160;
      const r = el?.getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) {
        // gone: dim the whole page and keep the card in the middle, so Next / Skip still work
        setRect(null);
        setPlace({ width, left: (vw - width) / 2, top: Math.max(EDGE, (vh - h) / 2) });
        return;
      }
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + 2 * PAD, height: r.height + 2 * PAD });
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), vw - width - EDGE);
      const below = r.bottom + PAD + GAP;
      const above = r.top - PAD - GAP - h;
      // below when it fits, else above, else (a section filling the window) over its lower edge
      const top = below + h <= vh - EDGE ? below : above >= EDGE ? above : vh - h - EDGE;
      setPlace({ width, left, top: Math.max(EDGE, top) });
    };
    if (el) {
      const r = el.getBoundingClientRect();
      const tall = r.height + 2 * PAD > window.innerHeight - 2 * EDGE;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: tall ? "start" : "center", inline: "nearest", behavior: smooth ? "smooth" : "auto" });
    }
    update();
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    // the card's own height changes with the text, and the section can grow or shrink while lit
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (card.current) observer?.observe(card.current);
    if (el) observer?.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      observer?.disconnect();
    };
  }, [step, root]);

  if (!open || !host || !step || !shown) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2200]">
      {/* swallows clicks on the dimmed page; the dimming itself is the lit box's huge shadow (or this layer, when there is no box) */}
      <div aria-hidden className={`absolute inset-0 ${rect ? "" : "bg-black/65"}`} />
      {rect && (
        <div
          aria-hidden
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          className="pointer-events-none fixed rounded-xl shadow-[0_0_0_9999px_rgb(0_0_0/0.65)] outline-2 outline-sky-400"
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-label={step.title}
        style={place ? { top: place.top, left: place.left, width: place.width } : { top: 0, left: 0, width: WIDTH, visibility: "hidden" }}
        className="fixed flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-left shadow-2xl shadow-black/60"
      >
        <p className="text-sm font-semibold text-slate-100">{step.title}</p>
        <p className="text-xs leading-relaxed text-slate-300">{step.text}</p>
        <div className="mt-1 flex items-center gap-2">
          <div aria-label={`Step ${i + 1} of ${shown.length}`} className="flex gap-1">
            {shown.map((s, n) => (
              <span key={s.target + n} className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-sky-400" : "bg-slate-700"}`} />
            ))}
          </div>
          <button type="button" tabIndex={-1} onClick={() => close(false)} className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
            Skip <EscKey />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {i > 0 && <Button size="sm" tabIndex={-1} onClick={() => setI(i - 1)}>Back</Button>}
          <Button
            size="sm"
            tabIndex={-1}
            className="ml-auto !border-sky-500/70 !bg-sky-500/20 !text-sky-100"
            onClick={() => (last ? close(true) : setI(i + 1))}
          >
            {last ? "Done" : "Next"} <SpaceKey />
          </Button>
        </div>
      </div>
    </div>,
    host,
  );
}
