"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { KeyChoice } from "@/features/creator";
import { paletteCatalog, sanitiseSubject, searchPalette, subjectTitle, type MediaState, type PaletteResult, type Subject } from "@/features/stage";

const RECENT = "musickit.studio.recent";
const MAX_RECENT = 5;

const GROUP_NAMES: Record<PaletteResult["group"], string> = { chord: "Chord", scale: "Scale", position: "Position", theory: "Theory", audio: "Sound", brand: "Brand", studio: "Studio" };

function loadRecent(pluginIds: string[]): Subject[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT) ?? "[]");
    return Array.isArray(raw) ? raw.map((r) => sanitiseSubject(r, pluginIds)).filter((s): s is Subject => s !== null).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: Subject[]) {
  try {
    window.localStorage.setItem(RECENT, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

const recentResult = (s: Subject): PaletteResult => ({ id: `recent:${JSON.stringify(s)}`, label: subjectTitle(s), detail: "Recent", group: "theory", action: { type: "add", subject: s } });

/**
 * The Spotlight-style search over the studio: type, pick with ↑ ↓ and Enter, Escape closes. Rendered on document.body, so it is
 * never inside the recorded frame. Picking a widget adds it; picking a studio command runs it.
 */
export default function Palette({ pluginIds, stageKey, media, onPick, onClose }: { pluginIds: string[]; stageKey: KeyChoice; media: MediaState; onPick: (r: PaletteResult) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent] = useState(() => loadRecent(pluginIds));
  const input = useRef<HTMLInputElement>(null);

  // nothing typed: recent picks first, then everything that can go on the stage
  const results = useMemo(() => {
    if (query.trim()) return searchPalette(query, pluginIds, stageKey, media);
    const recents = recent.map(recentResult);
    return [...recents, ...paletteCatalog(pluginIds, stageKey, media).filter((r) => !recents.some((x) => x.label === r.label))];
  }, [query, pluginIds, stageKey, media, recent]);

  useEffect(() => input.current?.focus(), []);

  const pick = (r: PaletteResult | undefined) => {
    if (!r) return;
    if (r.action.type === "add") {
      const s = r.action.subject;
      saveRecent([s, ...recent.filter((x) => JSON.stringify(x) !== JSON.stringify(s))]);
    }
    onPick(r);
    onClose();
  };

  return createPortal(
    <div data-chrome className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 pt-[14vh]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Add to the stage" className="w-[min(560px,90vw)] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            // the studio's shortcuts listen on window: keys typed here (Escape and Enter too) stay here
            e.stopPropagation();
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") pick(results[active]);
          }}
          placeholder="e6, a dorian, e minor pent pos 1, drone, key, camera corner…"
          className="w-full border-b border-slate-800 bg-transparent px-4 py-3 font-mono text-base text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Search"
        />
        <ul role="listbox" className="max-h-[50vh] overflow-auto py-1">
          {results.length === 0 && <li className="px-4 py-2 text-sm text-slate-500">Nothing for that. Try a chord, a key, a scale or a command.</li>}
          {!query.trim() && <li className="px-4 pb-1 pt-1.5 text-xs text-slate-500">Or type a chord (e6), a key (a dorian) or a position (e minor pent pos 2).</li>}
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(r)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left text-sm ${i === active ? "bg-sky-500/15 text-sky-100" : "text-slate-200"}`}
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-slate-500">{r.detail === "Recent" ? "Recent" : r.detail === r.label || r.detail === GROUP_NAMES[r.group] ? GROUP_NAMES[r.group] : `${GROUP_NAMES[r.group]} · ${r.detail}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
