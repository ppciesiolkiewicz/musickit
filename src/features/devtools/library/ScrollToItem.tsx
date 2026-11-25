"use client";

import { useEffect } from "react";

/**
 * A bare `?item=<id>` link (from a seed file, a note, a chat) has no `#item`, so the browser stays on the tables above
 * the drawn item. Scrolls to it once on load; an address with its own hash is left to the browser.
 */
export default function ScrollToItem() {
  useEffect(() => {
    if (window.location.hash === "") document.getElementById("item")?.scrollIntoView();
  }, []);
  return null;
}
