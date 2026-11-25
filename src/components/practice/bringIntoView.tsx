"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

/**
 * A tool scrolling itself into view as it starts (the melody singer's Play, a note game's start): only when too little
 * of it shows, so a tool mostly on screen stays where the player put it. Under `NoAutoScroll` it never scrolls: the
 * content videos' record page, where the tool sits over the camera and a scroll would move the camera off the screen.
 */

/** how much of the tool (or of the room it is shown in, when it is taller) must show for no scroll */
export const MOSTLY = 0.75;

const Off = createContext(false);

/** Tools under it never scroll themselves into view. */
export function NoAutoScroll({ children }: { children: ReactNode }) {
  return <Off.Provider value>{children}</Off.Provider>;
}

const scrolls = (el: Element) => {
  const { overflowY } = getComputedStyle(el);
  return (overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight;
};

/** Whether `MOSTLY` of `el` shows: its box cut to the window and to every scrolling box around it. */
export function mostlyShown(el: Element): boolean {
  const r = el.getBoundingClientRect();
  let top = 0, bottom = window.innerHeight;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (!scrolls(p)) continue;
    const b = p.getBoundingClientRect();
    top = Math.max(top, b.top);
    bottom = Math.min(bottom, b.bottom);
  }
  const room = Math.max(0, bottom - top);
  const shown = Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, top));
  return shown >= MOSTLY * Math.min(r.height, room);
}

/** Scrolls an element into view (`block` as `scrollIntoView`) unless most of it shows already or scrolling is off here. */
export function useBringIntoView() {
  const off = useContext(Off);
  return useCallback((el: Element | null | undefined, block: ScrollLogicalPosition = "center") => {
    if (off || !el || mostlyShown(el)) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block, behavior: still ? "auto" : "smooth" });
  }, [off]);
}
