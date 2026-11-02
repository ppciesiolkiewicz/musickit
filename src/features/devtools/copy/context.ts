import { squeeze, windowAround, type NoteContext } from "../model/copyNotes";

/*
 * What's round a text when it is noted, read from the page: the headings and labelled regions it sits under, the React
 * components that render it and the text of the block round it. Saved with the note, so the copied notes tell an AI
 * tool (or a person) which screen, component and passage to change, not just the words.
 */

/** React and Next's own components: the walk up stops at the first, since above it is the router and the root layout. */
const FRAMEWORK = /(Router|Boundary|Context|Handler|Template.*|Segment.*|Fallback.*)$|^(ClientPageRoot|ClientSegmentRoot|ServerRoot|HotReload|Suspense|Fragment|AppDevOverlay.*|ReactDevOverlay|__next.*)$/;

/** Components that wrap others without telling where to look, skipped. */
const GENERIC = /^(Link|LinkComponent|Image|Script|Head|ForwardRef|Memo)$|(Provider|Consumer)$/;

interface Fiber {
  type?: unknown;
  return?: Fiber | null;
}

const nameOf = (type: unknown): string | null => {
  if (typeof type === "function") return (type as { displayName?: string; name?: string }).displayName || type.name || null;
  if (type && typeof type === "object") {
    // memo(...) and forwardRef(...) wrap the component
    const t = type as { displayName?: string; type?: unknown; render?: unknown };
    return t.displayName || nameOf(t.type ?? t.render);
  }
  return null;
};

/** The app's components that render `el` (the innermost `max`), outermost first, from React's dev fiber on the element (none in production). */
function componentsOf(el: Element, max = 6): string[] {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  const names: string[] = [];
  for (let f = key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null; f && names.length < max; f = f.return ?? null) {
    const name = nameOf(f.type);
    // short names are minified or generic; a name twice in a row is a wrapper of itself
    if (name && FRAMEWORK.test(name)) break;
    if (name && name.length > 2 && /^[A-Z]/.test(name) && !GENERIC.test(name) && names[names.length - 1] !== name) names.push(name);
  }
  return names.reverse();
}

const HEADING = "h1,h2,h3,h4,h5,h6";

/** A box of its own (fixed, or a dialog): what is round it on the page is not its context. */
const ownBox = (e: Element) => e.getAttribute("role") === "dialog" || e.tagName === "DIALOG" || getComputedStyle(e).position === "fixed";

/** A region's own label: an aria-label on a nav, dialog, section and the like. */
const regionLabel = (e: Element) => {
  const label = e.getAttribute("aria-label");
  return label && (e.getAttribute("role") || /^(nav|section|aside|dialog|form|header|footer|main|fieldset)$/i.test(e.tagName)) ? label : null;
};

/**
 * What `el` sits under, outermost first: the labelled regions round it, and walking up, the nearest heading before it
 * among each level's children (a heading, or a small header round one, not a sibling card's), each further out of a
 * higher rank. Stops at a box of its own, so a floating panel doesn't take the page's headings.
 */
function underOf(el: Element, root: string): string[] {
  const out: string[] = [];
  let level = 7;
  for (let child: Element = el, e = el.parentElement; e && e !== document.body; child = e, e = e.parentElement) {
    const before = [...e.children].slice(0, [...e.children].indexOf(child)).reverse();
    for (const s of before) {
      if (s.hasAttribute(root)) continue;
      const h = s.matches(HEADING) ? s : (s as HTMLElement).innerText?.length <= 160 ? s.querySelector(HEADING) : null;
      const l = h ? Number(h.tagName[1]) : 7;
      const text = h ? squeeze((h as HTMLElement).innerText ?? "", 80) : "";
      if (text && l < level) {
        out.unshift(text);
        level = l;
        break;
      }
    }
    const label = regionLabel(e);
    if (label && label !== out[0]) out.unshift(label);
    if (ownBox(e)) break;
  }
  return out;
}

/** The text of the nearest block round `el` that says more than it does, cut to a window round its text; none when that
 * block is most of the page. */
function aroundOf(el: HTMLElement, text: string): string | undefined {
  for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
    const full = (e.innerText ?? "").replace(/\s+/g, " ").trim();
    if (full.length > text.length + 10) return full.length <= 1500 ? windowAround(full, text) : undefined;
  }
  return undefined;
}

/** Everything `NoteContext` holds about `el`, leaving out what is empty. */
export function contextOf(el: HTMLElement, text: string, root: string): NoteContext {
  const c: NoteContext = { under: underOf(el, root), components: componentsOf(el), around: aroundOf(el, text) };
  return Object.fromEntries(Object.entries(c).filter(([, v]) => (Array.isArray(v) ? v.length : v))) as NoteContext;
}
