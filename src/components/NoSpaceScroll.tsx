"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Pages read top to bottom, where Space keeps the browser's page-down: the landing pages, the kickstarter and the demos. */
const SCROLL_PAGES = new Set(["/", "/teach", "/players", "/landing-1", "/kickstarter", "/dev/kickstarter", "/demo"]);

// where Space is the element's own key: typing, pressing a button, opening a menu
const OWN_SPACE = 'input, textarea, select, button, a, summary, [contenteditable="true"], [role="button"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [role="radio"], [role="slider"]';

/**
 * On tool pages Space never scrolls the page. Space is a tool's play and next key, so a page jumping down when no tool
 * took it (or between tools) is a surprise. Runs after the tools' own key handlers; a key they used is already stopped.
 */
export default function NoSpaceScroll() {
  const path = usePathname();
  const on = !SCROLL_PAGES.has(path);
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest(OWN_SPACE)) return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on]);
  return null;
}
