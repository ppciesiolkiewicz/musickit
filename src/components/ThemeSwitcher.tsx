"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./Icon";

/** The colour themes. Their palettes live in `src/app/themes.css`; `swatch` is background, neutral and accent for the picker. */
export const THEMES = [
  { id: "dark", label: "Dark", swatch: ["#020617", "#334155", "#38bdf8"] },
  { id: "light", label: "Light", swatch: ["#f8fafc", "#cbd5e1", "#0284c7"] },
  { id: "funky", label: "Funky", swatch: ["#1a0b2e", "#5b2a86", "#f6339a"] },
  { id: "modern", label: "Modern", swatch: ["#0a0a0a", "#404040", "#7c86ff"] },
  { id: "sandstorm", label: "Sandstorm", swatch: ["#efdfca", "#b39a80", "#c2410c"] },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_KEY = "musickit.theme";
const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

/** Runs before the first paint (inline in <head>) so a saved theme never flashes. */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(${JSON.stringify(THEMES.map((t) => t.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;

function applyTheme(id: ThemeId) {
  const html = document.documentElement;
  html.classList.add("theme-fade");
  html.dataset.theme = id;
  window.setTimeout(() => html.classList.remove("theme-fade"), 250);
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {}
}

const readTheme = (): ThemeId => {
  const t = document.documentElement.dataset.theme;
  return isTheme(t) ? t : "dark";
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

/** A small settings button that opens the theme list and a full screen toggle. Shared by every page; knows nothing about any feature. */
export default function ThemeSwitcher({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as ThemeId);
  const fullscreen = useSyncExternalStore(subscribeFullscreen, readFullscreen, () => false);
  const fullscreenable = useSyncExternalStore(subscribeFullscreen, canFullscreen, () => false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Settings"
        title={`Settings · ${current.label} theme`}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/80 bg-slate-900/70 text-xs text-slate-300 backdrop-blur transition hover:border-slate-500 hover:text-slate-100"
      >
        <Icon name="settings" size={14} />
      </button>
      {open && (
        <div role="menu" aria-label="Settings" className="absolute right-0 top-full z-[3000] mt-1.5 w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-xl shadow-black/30 backdrop-blur">
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Theme</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === theme}
              onClick={() => {
                applyTheme(t.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${t.id === theme ? "bg-sky-500/15 text-sky-100" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <span className="flex -space-x-1.5" aria-hidden>
                {t.swatch.map((c, i) => (
                  <span key={i} className="h-4 w-4 rounded-full ring-1 ring-slate-500/50" style={{ background: c }} />
                ))}
              </span>
              <span className="flex-1">{t.label}</span>
              {t.id === theme && <Icon name="check" size={14} />}
            </button>
          ))}
          {fullscreenable && (
            <>
              <div className="my-1 border-t border-slate-800" role="separator" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={fullscreen}
                onClick={() => {
                  toggleFullscreen();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-slate-300 transition hover:bg-slate-800"
              >
                <Icon name={fullscreen ? "minimize" : "maximize"} size={14} />
                <span className="flex-1">{fullscreen ? "Exit full screen" : "Full screen"}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
