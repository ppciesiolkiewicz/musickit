"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./Icon";
import { DEFAULT_STYLE, SEEN_KEY, STYLES, THEME_KEY, isStyle, readSaved, styleAfterIntroDismiss, styleById, type StyleId } from "@/features/styles/styles";

/** Runs before the first paint (inline in <head>) so a saved style never flashes; anything else keeps the Funk set on <html>. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(${JSON.stringify(STYLES.map((s) => s.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;

/** The style's own headline face, for its name on the button; Default uses the Fraunces wordmark face. */
const labelFont = (id: StyleId) => (id === "plain" ? "var(--font-display), serif" : `var(--font-${id}), var(--font-display), serif`);

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

function applyStyle(id: StyleId) {
  const html = document.documentElement;
  html.classList.add("theme-fade");
  html.dataset.theme = id;
  window.setTimeout(() => html.classList.remove("theme-fade"), 250);
  store(THEME_KEY, id);
}

// the "seen" flag only changes through this component, which tracks closing itself, so there is nothing to subscribe to.
// Each page mounts its own switcher, so closing is also remembered here for the rest of the visit, in case storage is blocked.
let settledThisVisit = false;
const subscribeNever = () => () => {};
const readUnseen = () => {
  if (settledThisVisit) return false;
  let storage: Storage | null = null;
  try {
    storage = localStorage;
  } catch {}
  return !readSaved(storage).seen;
};

const readStyle = (): StyleId => {
  const t = document.documentElement.dataset.theme;
  return isStyle(t) ? t : DEFAULT_STYLE;
};
// every switcher on the page follows the <html> attribute
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

// browser full screen: on while anything is full screen, and only offered where the browser allows it (not iPhone Safari)
const subscribeFullscreen = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const readFullscreen = () => document.fullscreenElement !== null;
const canFullscreen = () => document.fullscreenEnabled === true;
const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

/**
 * The palette button, named after the current music style in that style's own font, and the style picker it opens.
 * On a first visit the picker opens by itself with the current pick (Funk) pulsing; closing it without choosing settles on
 * Default. Shared by every page; knows nothing about any feature.
 */
export default function ThemeSwitcher({ className = "" }: { className?: string }) {
  const style = useSyncExternalStore(subscribe, readStyle, () => DEFAULT_STYLE);
  const fullscreen = useSyncExternalStore(subscribeFullscreen, readFullscreen, () => false);
  const fullscreenable = useSyncExternalStore(subscribeFullscreen, canFullscreen, () => false);
  // first visit: the picker opens by itself until it has been closed once (the server renders it closed)
  const unseen = useSyncExternalStore(subscribeNever, readUnseen, () => false);
  const [settled, setSettled] = useState(false);
  const intro = unseen && !settled;
  const [picked, setPicked] = useState(false);
  const open = intro || picked;
  const box = useRef<HTMLDivElement>(null);

  const close = (dismissed: boolean) => {
    if (intro) {
      if (dismissed) applyStyle(styleAfterIntroDismiss());
      store(SEEN_KEY, "1");
      settledThisVisit = true;
      setSettled(true);
    }
    setPicked(false);
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close(true);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  });

  const current = styleById(style);
  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close(true) : setPicked(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Style: ${current.label}`}
        title="Pick a style"
        className="flex h-8 items-center gap-1.5 rounded-full border border-sky-500/45 bg-slate-900/70 pl-2.5 pr-3 text-slate-100 backdrop-blur transition hover:border-sky-400"
      >
        <Icon name="palette" size={15} className="text-sky-400" />
        <span className="whitespace-nowrap text-[15px] leading-none" style={{ fontFamily: labelFont(style) }}>{current.label}</span>
      </button>
      {open && (
        // deliberately neutral: the same plain card whatever style is on
        <div role="dialog" aria-label="Pick a style" className="fixed inset-x-4 top-16 z-[3000] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[25rem] rounded-[22px] border border-[#e4e4e7] bg-[#fafafa] px-4 pb-3 pt-4 text-center text-[#18181b] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)] [font-family:var(--font-geist-sans)]">
          <p className="mb-3 text-[17px] font-medium">👋 Just a quick one: your favourite style?</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {STYLES.map((s) => {
              const on = s.id === style;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    applyStyle(s.id);
                    close(false);
                  }}
                  className={`group flex flex-col items-center gap-1.5 text-[13px] focus-visible:outline-none ${on ? "font-semibold text-[#18181b]" : "text-[#3f3f46]"}`}
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-full border-2 text-[28px] transition group-hover:-translate-y-0.5 group-hover:scale-105 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#18181b] ${on ? "border-[#18181b] bg-white" : "border-[#e4e4e7] bg-[#f0f0f2]"} ${on && intro ? "style-pulse" : ""}`} aria-hidden>
                    {s.emoji}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
          {intro && (
            <button type="button" onClick={() => close(true)} className="mt-3 text-[13px] text-[#71717a] underline underline-offset-[3px] hover:text-[#18181b]">
              Not now
            </button>
          )}
          {fullscreenable && (
            <button
              type="button"
              aria-pressed={fullscreen}
              onClick={() => {
                toggleFullscreen();
                close(false);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 border-t border-[#e4e4e7] pt-2.5 text-[13px] text-[#3f3f46] hover:text-[#18181b]"
            >
              <Icon name={fullscreen ? "minimize" : "maximize"} size={14} />
              {fullscreen ? "Exit full screen" : "Full screen"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
