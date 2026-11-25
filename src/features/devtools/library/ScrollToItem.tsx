"use client";

import { useEffect } from "react";

/** Whether this page load has opened an item yet: a full load starts over, a click in the tables does not. */
let loaded = false;

/**
 * Keeps the open item's own row in view. On a page load from a link (a seed file, a note, a chat) it scrolls to the row,
 * unless the address has its own hash. On a click in the tables it scrolls only when the row went off the screen (an
 * item open above it closed and the rows moved up), so the row stays where it was clicked.
 */
export default function ScrollToItem() {
  useEffect(() => {
    const item = document.getElementById("item");
    const row = item?.previousElementSibling instanceof HTMLTableRowElement ? item.previousElementSibling : item;
    if (!row) return;
    if (!loaded) {
      loaded = true;
      if (window.location.hash === "") row.scrollIntoView();
      return;
    }
    const top = row.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight) row.scrollIntoView();
  }, []);
  return null;
}
