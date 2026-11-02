import { squeeze, windowAround, type NoteContext } from "../model/copyNotes";

/*
 * What's round a text when it is noted, read from the page: the headings and labelled regions it sits under, the React
 * components that render it, the line of JSX that made it (`sourcesOf`, in dev) and the text of the block round it. Saved with the note, so the copied notes tell an AI
 * tool (or a person) which screen, component and passage to change, not just the words.
 */

/** React and Next's own components: the walk up stops at the first, since above it is the router and the root layout. */
const FRAMEWORK = /(Router|Boundary|Context|Handler|Template.*|Segment.*|Fallback.*)$|^(ClientPageRoot|ClientSegmentRoot|ServerRoot|HotReload|Suspense|Fragment|AppDevOverlay.*|ReactDevOverlay|__next.*)$/;

/** Components that wrap others without telling where to look, skipped. */
const GENERIC = /^(Link|LinkComponent|Image|Script|Head|ForwardRef|Memo)$|(Provider|Consumer)$/;

interface Fiber {
  type?: unknown;
  return?: Fiber | null;
  /** dev only: the component whose JSX made this element, and that JSX call's stack */
  _debugOwner?: Fiber | null;
  _debugStack?: { stack?: string } | null;
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

const fiberOf = (el: Element): Fiber | null => {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
};

/** The app's components that render `el` (the innermost `max`), outermost first, from React's dev fiber on the element (none in production). */
function componentFibersOf(el: Element, max = 6): { name: string; fiber: Fiber }[] {
  const out: { name: string; fiber: Fiber }[] = [];
  for (let f = fiberOf(el); f && out.length < max; f = f.return ?? null) {
    const name = nameOf(f.type);
    // short names are minified or generic; a name twice in a row is a wrapper of itself
    if (name && FRAMEWORK.test(name)) break;
    if (name && name.length > 2 && /^[A-Z]/.test(name) && !GENERIC.test(name) && out[out.length - 1]?.name !== name) out.push({ name, fiber: f });
  }
  return out.reverse();
}

const componentsOf = (el: Element) => componentFibersOf(el).map((c) => c.name);

/* ---- where in the source: the line of JSX that made an element, from the stack React keeps of that call in dev ---- */

interface Frame {
  file: string;
  line1: number;
  column1: number;
}

/** The first frame of a JSX call's stack in the app's own bundle (not React's, not a package's): a place in a chunk. */
function callSiteOf(f: Fiber | null): Frame | null {
  for (const line of f?._debugStack?.stack?.split("\n").slice(1) ?? []) {
    const m = /\(?(https?:\/\/[^/]+)?(\/_next\/static\/chunks\/[^:)]+):(\d+):(\d+)\)?\s*$/.exec(line);
    if (m && !/node_modules|next_dist|react-dom|jsxDEV/.test(m[2] + line)) return { file: m[2], line1: Number(m[3]), column1: Number(m[4]) };
  }
  return null;
}

/**
 * The noted element's line of JSX ("src/…/Controls.tsx:40:9") and each component's with the file it is in ("Row
 * src/…/Controls.tsx:12"): a component's place is the nearest element round the noted one that its JSX made. Asks
 * /api/dev/source to map the bundle back; nothing where it can't (a production build, another bundler).
 */
export async function sourcesOf(el: Element): Promise<Pick<NoteContext, "source" | "components">> {
  const host = fiberOf(el);
  const comps = componentFibersOf(el);
  const madeBy = (owner: Fiber) => {
    for (let f = host; f; f = f.return ?? null) if (typeof f.type === "string" && f._debugOwner === owner) return callSiteOf(f);
    return null;
  };
  const frames = [callSiteOf(host), ...comps.map((c) => madeBy(c.fiber))];
  const known = frames.filter((f): f is Frame => !!f);
  if (!known.length) return {};
  try {
    const res = await fetch("/api/dev/source", { method: "POST", body: JSON.stringify({ frames: known }) });
    const mapped = (await res.json()) as (string | null)[];
    if (!Array.isArray(mapped)) return {};
    let i = 0;
    const at = frames.map((f) => (f ? (mapped[i++] ?? null) : null));
    const [source, ...rest] = at;
    return {
      ...(source ? { source } : {}),
      components: comps.map((c, k) => (rest[k] ? `${c.name} ${rest[k]!.replace(/:\d+$/, "")}` : c.name)),
    };
  } catch {
    return {};
  }
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
