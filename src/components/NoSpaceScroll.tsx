"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Pages read top to bottom, where Space keeps the browser's page-down: the landing pages, the kickstarter and the demos. */
const SCROLL_PAGES = new Set(["/", "/teach", "/players", "/landing-1", "/kickstarter", "/dev/kickstarter", "/demo"]);

// where the browser gives Space a job of its own: typing, pressing a button, ticking a box, opening a menu or details.
// A link or an element that only has a role (a `<g role="button">`, a `<div role="tab">`) has none: Space there scrolls
// the page, so it is stopped like anywhere else. Its own key handler has already run by then.
const OWN_SPACE = 'input, textarea, select, button, summary, [contenteditable="true"], [contenteditable=""]';

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
