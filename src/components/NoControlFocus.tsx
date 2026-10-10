"use client";

import { useEffect } from "react";

// Buttons, selects, sliders and checkboxes. Text and number fields keep focus so they can be typed in.
const CONTROLS = 'button, select, input[type="range"], input[type="checkbox"], input[type="radio"], [role="button"]';

function untab(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(CONTROLS).forEach((el) => {
    if (el.tabIndex !== -1) el.tabIndex = -1;
  });
}

function releaseFocus() {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.matches(CONTROLS)) el.blur();
}

/**
 * Controls never hold the keyboard: they are out of the tab order, and focus is dropped once the mouse is done with them.
 * The computer keyboard plays notes and runs shortcuts, so a focused button or slider would otherwise swallow Space and the arrows.
 */
export default function NoControlFocus() {
  useEffect(() => {
    untab(document);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches(CONTROLS) && n.tabIndex !== -1) n.tabIndex = -1;
          untab(n);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // A select is still open after pointerup, so it lets go on change instead.
    const onPointerUp = () => {
      if (!(document.activeElement instanceof HTMLSelectElement)) releaseFocus();
    };
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("change", releaseFocus);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("change", releaseFocus);
    };
  }, []);
  return null;
}
