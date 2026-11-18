import type { MessageContext } from "../model/message";
import { MAX_SELECTION } from "../model/message";
import { refOf } from "../model/placement";

const HEADINGS = "h1,h2,h3,h4";
/** The bubble's own panel: never read as part of the page. */
export const PANEL_ATTR = "data-messages-panel";

/**
 * The headings a place on the page sits under, outermost first: each heading above `y` (page coordinates) that is of a
 * higher level than the one after it. DOM only, so it works in a production build (unlike the dev notes' source lookup).
 */
function headingsAbove(y: number): string[] {
  const all = [...document.querySelectorAll<HTMLElement>(HEADINGS)].filter((h) => !h.closest(`[${PANEL_ATTR}]`) && h.offsetParent !== null);
  const above = all.filter((h) => h.getBoundingClientRect().top + window.scrollY <= y);
  const out: string[] = [];
  let level = 9;
  for (let i = above.length - 1; i >= 0 && level > 1; i--) {
    const l = Number(above[i].tagName[1]);
    const text = above[i].innerText.replace(/\s+/g, " ").trim();
    if (text && l < level) {
      out.unshift(text.slice(0, 80));
      level = l;
    }
  }
  return out.slice(-4);
}

/** Where the user is: path, title, headings above what they selected (or above the middle of the screen), the course section, the selected text. */
export function pageContext(selection: { text: string; y: number } | null): MessageContext {
  const y = selection?.y ?? window.scrollY + window.innerHeight * 0.4;
  const under = headingsAbove(y);
  const c: MessageContext = {
    path: `${location.pathname}${location.search}`,
    title: document.title || undefined,
    under: under.length ? under : undefined,
    ref: refOf(location.pathname, location.hash),
    selection: selection?.text ? selection.text.slice(0, MAX_SELECTION) : undefined,
  };
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as MessageContext;
}

/** The text selected on the page now, and where it is, or null. Read before the bubble takes focus. */
export function readSelection(): { text: string; y: number } | null {
  const sel = window.getSelection();
  const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
  if (!sel || !text || sel.rangeCount === 0) return null;
  const node = sel.getRangeAt(0).startContainer;
  const el = node instanceof Element ? node : node.parentElement;
  if (el?.closest(`[${PANEL_ATTR}]`)) return null;
  return { text, y: (el?.getBoundingClientRect().top ?? 0) + window.scrollY };
}

/** One line for the panel: what the message will be about. */
export function aboutLine(c: MessageContext): string {
  const where = c.under?.length ? c.under.join(" · ") : c.title ?? c.path ?? "";
  return where;
}
