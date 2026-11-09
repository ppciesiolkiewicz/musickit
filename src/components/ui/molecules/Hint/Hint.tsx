"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "../../atoms/EscKey";

type HintState = { on: boolean; toggle: () => void };
const HintContext = createContext<HintState | null>(null);

/**
 * Arms a region of the page for hover-help: once on, any `Hint` inside it shows what its control does instead of
 * letting a hover (or, on touch, a tap) through to it. One provider covers everything under it, however deep (several
 * `SingAlong` cards, a page's own buttons, …), so a single `HintToggle` anywhere inside arms them all together.
 */
export function HintProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  return <HintContext.Provider value={{ on, toggle: () => setOn((v) => !v) }}>{children}</HintContext.Provider>;
}

/** The small (?) that arms or disarms the nearest `HintProvider`. Nothing without one. */
export function HintToggle({ label = "What does this do? Hover anything to find out" }: { label?: string }) {
  const ctx = useContext(HintContext);
  useEscape(!!ctx?.on, () => ctx?.toggle());
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-pressed={ctx.on}
      title={ctx.on ? "Stop showing what things do" : label}
      aria-label={ctx.on ? "Stop showing what things do" : label}
      className={`inline-flex h-6 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[11px] font-semibold transition-all duration-200 ease-out ${ctx.on ? "w-11 gap-1 border-sky-400 bg-sky-500/20 px-1.5 text-sky-200" : "w-6 border-slate-600 text-slate-400 hover:border-slate-400"}`}
    >
      <span>?</span>
      {/* the circle widens into an oval that holds the Esc cue */}
      {ctx.on && <span aria-hidden className="text-[9px] font-medium normal-case tracking-normal">Esc</span>}
    </button>
  );
}

/** The card's fixed width, so its clamped `left` is right the first time it's measured, not just on a later resize. */
const WIDTH = 256;
const GAP = 8;
const EDGE = 10;

/**
 * Wraps one control with a quick explanation. While its `HintProvider` is unarmed this is transparent — just the
 * child. Armed, a dashed outline marks it as one with something to say; a see-through layer sits over the control
 * (its own cursor, e.g. a button's, would otherwise win) so hovering it (a mouse) or tapping it (touch) shows a card
 * — `title` says what it is in a word or two, `description` adds a sentence — above the control when there's room,
 * below it otherwise, and always kept inside the window, however close to its edge the control sits. The control
 * itself never sees the hover or the tap, so looking one up never fires it. Closes on a click elsewhere, Escape, or
 * the provider disarming.
 */
export function Hint({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const ctx = useContext(HintContext);
  const [show, setShow] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  // disarming hides any tooltip left open; adjusted during render (not an effect) per React's own guidance on mirroring a prop
  const wasOn = useRef(ctx?.on);
  if (wasOn.current !== ctx?.on) {
    wasOn.current = ctx?.on;
    if (show && !ctx?.on) setShow(false);
  }
  useLayoutEffect(() => {
    if (!show) return;
    const update = () => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(Math.max(r.left + r.width / 2 - WIDTH / 2, EDGE), window.innerWidth - WIDTH - EDGE);
      const above = r.top - GAP - EDGE;
      setPlace(above > 70 ? { left, bottom: window.innerHeight - r.top + GAP } : { left, top: r.bottom + GAP });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [show]);
  useEffect(() => {
    if (!show) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setShow(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [show]);
  if (!ctx?.on) return <>{children}</>;
  return (
    <span ref={box} className="relative inline-flex rounded-md outline-dashed outline-1 outline-offset-2 outline-sky-400/70">
      {children}
      {/* a see-through layer over the control: its own cursor wins (a button's would beat an inherited one), and it
          takes the hover or the tap instead of the control underneath */}
      <span
        aria-hidden
        className="absolute inset-0 z-10 cursor-help rounded-md"
        onPointerEnter={(e) => e.pointerType === "mouse" && setShow(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setShow(false)}
        onClick={() => setShow((v) => !v)}
      />
      {show && place && createPortal(
        <div
          role="tooltip"
          style={{ left: place.left, top: place.top, bottom: place.bottom, width: WIDTH }}
          className="fixed z-[2100] flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-left shadow-xl shadow-black/40"
        >
          <p className="text-xs font-semibold text-slate-100">{title}</p>
          {description && <p className="text-[11px] leading-relaxed text-slate-400">{description}</p>}
        </div>,
        document.body,
      )}
    </span>
  );
}
