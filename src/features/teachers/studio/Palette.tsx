"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import type { KeyChoice } from "@/features/creator";
import ControlBadge, { PageBadge } from "./ControlBadge";
import { PALETTE_GROUPS, groupResults, isControl, isPage, paletteCatalog, searchPalette, subjectIdentity, type Layer, type MediaState, type PaletteResult } from "@/features/stage";

type Row = { kind: "group"; name: string } | { kind: "sub"; name: string } | { kind: "result"; result: PaletteResult; index: number };

/** The list as it is drawn: a separator per section, a smaller heading per subsection, then the results, numbered for ↑ ↓. */
function rowsOf(results: PaletteResult[], ranked: boolean): { rows: Row[]; flat: PaletteResult[] } {
  const rows: Row[] = [];
  const flat: PaletteResult[] = [];
  for (const g of groupResults(results, ranked)) {
    rows.push({ kind: "group", name: PALETTE_GROUPS[g.group] });
    let sub: string | undefined;
    for (const r of g.results) {
      if (r.sub && r.sub !== sub) rows.push({ kind: "sub", name: r.sub });
      sub = r.sub;
      rows.push({ kind: "result", result: r, index: flat.length });
      flat.push(r);
    }
  }
  return { rows, flat };
}

/**
 * The widget picker over the studio: every widget, by section, ticked when it is on the stage. Click a row (or Enter) to put it on
 * the stage or take it off; it stays open, so several can be ticked at once. Typing searches; Escape or a click outside closes.
 * A studio command (camera, screen share) runs and closes. Rendered on document.body, so it is never inside the recorded frame.
 */
export default function Palette({ pluginIds, stageKey, media, layers, onPick, onRemove, onClose }: {
  pluginIds: string[];
  stageKey: KeyChoice;
  media: MediaState;
  /** what is on the stage now, to tick its rows */
  layers: Layer[];
  onPick: (r: PaletteResult) => void;
  onRemove: (layerId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const { rows, flat } = useMemo(() => {
    const q = query.trim();
    return rowsOf(q ? searchPalette(q, pluginIds, stageKey, media) : paletteCatalog(pluginIds, stageKey, media), !!q);
  }, [query, pluginIds, stageKey, media]);

  /** the stage's widgets by identity: a row is ticked when one with its identity is there, whatever its key */
  const onStage = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const l of layers) m.set(subjectIdentity(l.subject), [...(m.get(subjectIdentity(l.subject)) ?? []), l.id]);
    return m;
  }, [layers]);
  const idsOf = (r: PaletteResult) => (r.action.type === "add" ? onStage.get(subjectIdentity(r.action.subject)) ?? [] : []);

  useEffect(() => input.current?.focus(), []);
  // the list is long: keep the active row in view while ↑ ↓ move through it
  useEffect(() => {
    list.current?.querySelector(`[aria-selected="true"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const toggle = (r: PaletteResult | undefined) => {
    if (!r) return;
    if (r.action.type === "command") {
      onPick(r);
      onClose();
      return;
    }
    const ids = idsOf(r);
    if (ids.length) ids.forEach(onRemove);
    else onPick(r);
    input.current?.focus();
  };

  return createPortal(
    <div data-chrome className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 pt-[10vh]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Widgets on the stage" className="flex w-[min(600px,92vw)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
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
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") toggle(flat[active]);
          }}
          placeholder="Search: fretboard, a dorian, pent pos 2, e shape, sus iv, metronome, camera…"
          className="w-full border-b border-slate-800 bg-transparent px-4 py-3 font-mono text-base text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Search"
        />
        <ul ref={list} role="listbox" aria-multiselectable className="max-h-[64vh] overflow-auto py-1">
          {flat.length === 0 && <li className="px-4 py-2 text-sm text-slate-500">Nothing for that. Try a widget name, a key (a dorian) or a command.</li>}
          {rows.map((row, k) => {
            if (row.kind === "group")
              return (
                <li key={`g:${row.name}`} role="presentation" className={`px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${k > 0 ? "mt-1 border-t border-slate-800" : ""}`}>
                  {row.name}
                </li>
              );
            if (row.kind === "sub")
              return (
                <li key={`s:${k}:${row.name}`} role="presentation" className="px-4 pb-0.5 pt-1.5 text-[11px] text-slate-500">
                  {row.name}
                </li>
              );
            const r = row.result, i = row.index;
            const on = idsOf(r).length > 0;
            return (
              <li key={r.id} role="option" aria-selected={i === active} aria-checked={r.action.type === "add" ? on : undefined} className="px-2 py-0.5">
                <button
                  type="button"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => toggle(r)}
                  title={r.action.type === "command" ? undefined : on ? "On the stage: click to take it off" : "Click to put it on the stage"}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ring-1 ${on ? "ring-emerald-500/70" : "ring-transparent"} ${i === active ? "bg-sky-500/15 text-sky-100" : on ? "bg-emerald-500/5 text-slate-100" : "text-slate-200"}`}
                >
                  {r.action.type === "add" ? (
                    <span aria-hidden className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-600"}`}>
                      {on && <Icon name="check" size={12} />}
                    </span>
                  ) : (
                    <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center text-slate-500"><Icon name="chevron-right" size={12} /></span>
                  )}
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate">{r.label}</span>
                    {r.action.type === "add" && isControl(r.action.subject) && <ControlBadge />}
                    {r.action.type === "add" && isPage(r.action.subject) && <PageBadge />}
                  </span>
                  {r.detail && <span className="shrink-0 truncate text-xs text-slate-500">{r.detail}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-slate-800 px-4 py-1.5 text-[11px] text-slate-500">Click or Enter to put a widget on the stage or take it off · Esc closes</p>
      </div>
    </div>,
    document.body,
  );
}
