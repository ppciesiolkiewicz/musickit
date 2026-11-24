"use client";

import { useEffect } from "react";

// Buttons, selects, sliders and checkboxes. Text and number fields keep focus so they can be typed in.
const CONTROLS = 'button, select, input[type="range"], input[type="checkbox"], input[type="radio"], [role="button"], [role="slider"]';
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

function releaseFocus() {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.matches(CONTROLS)) el.blur();
}

/** Elements Tab may land on: focusable, not a control, not disabled, not tabindex -1, and shown. */
function tabStops(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.matches(CONTROLS) && el.tabIndex >= 0 && !(el as HTMLInputElement).disabled && el.getClientRects().length > 0,
  );
}

/**
 * Controls never hold the keyboard: Tab skips over them, and focus is dropped once the mouse is done with them.
 * The computer keyboard plays notes and runs shortcuts, so a focused button or slider would otherwise swallow Space and the arrows.
 * Tab is handled here rather than by writing tabindex onto the page, which would change server HTML that a streamed
 * part of the page has not hydrated yet and make React report a mismatch.
 */
export default function NoControlFocus() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const stops = tabStops();
      const from = document.activeElement;
      const after = (el: HTMLElement) => from instanceof Node && from !== document.body && !!(from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      const next = e.shiftKey
        ? [...stops].reverse().find((el) => !after(el) && el !== from && !el.contains(from as Node))
        : stops.find((el) => (from === document.body || from === null ? true : after(el) && !el.contains(from as Node)));
      e.preventDefault();
      next?.focus();
    };
    // A select is still open after pointerup, so it lets go on change instead.
    const onPointerUp = () => {
      if (!(document.activeElement instanceof HTMLSelectElement)) releaseFocus();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("change", releaseFocus);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("change", releaseFocus);
    };
  }, []);
  return null;
}
