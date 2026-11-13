"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import type { KeyChoice } from "@/features/creator";
import ControlBadge, { MicBadge, PageBadge } from "./ControlBadge";
import { cellFromSubject } from "@/features/teachers/notes/model/note";
import FamilyStep, { FamilyEditor } from "./FamilyStep";
import {
  FAMILIES, PALETTE_GROUPS, addableValues, describeSubject, familyOf, groupResults, isControl, isNoteCommand, isPage, paletteCatalog, paletteChoice, pinAgainst, takesMic, searchPalette, stepValues,
  subjectIdentity, type Family, type FamilyValues, type Layer, type MediaState, type PaletteResult, type Subject,
} from "@/features/stage";

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

/** The family open in the list: the props picked for a new widget in `key`. */
interface Open {
  family: Family;
  key: KeyChoice;
  values: FamilyValues;
}

const familyById = (id: string) => FAMILIES.find((f) => f.id === id);

/** The family a row offers, or null. */
const rowFamily = (r: PaletteResult | undefined) => (r?.action.type === "family" ? familyById(r.action.familyId) ?? null : null);

/** A family row opened: its add form in the row's key. */
const opened = (r: PaletteResult | undefined): Open | null => {
  const family = rowFamily(r);
  return family && r?.action.type === "family" ? { family, key: r.action.key, values: stepValues(family, r.action.key) } : null;
};

/**
 * The widget picker over the studio: every widget by section, ticked when it is on the stage. Click a row (or Enter) to put it on
 * the stage or take it off; it stays open, so several can be ticked at once. A **family** row (Scale, CAGED, Arpeggio...) opens in
 * place, one at a time: its options, **Add to stage** (or Enter in the search, or on an option), then its widgets on the stage, each
 * with its options to edit in place and ✕. Typing searches; a key alone ("a dorian") lists the families and opens the first. Escape
 * closes an open family, then the picker; a click outside closes it. A studio command (camera, screen share) runs and closes.
 * Rendered on document.body, so it is never inside the recorded frame.
 */
export default function Palette({ notes = false, pluginIds, stageKey, media, layers, onPick, onUpdate, onRemove, onClose }: {
  /** the notes creator: no camera, screen or audio widgets */
  notes?: boolean;
  pluginIds: string[];
  stageKey: KeyChoice;
  media: MediaState;
  /** what is on the stage now, to tick its rows and list its family widgets */
  layers: Layer[];
  onPick: (r: PaletteResult) => void;
  /** a widget on the stage edited under its family */
  onUpdate: (layerId: string, subject: Subject) => void;
  onRemove: (layerId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<Open | null>(null);
  /** the widget whose options are open, under its family */
  const [editing, setEditing] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const resultsFor = (q: string) => {
    const all = q.trim() ? searchPalette(q.trim(), pluginIds, stageKey, media) : paletteCatalog(pluginIds, stageKey, media);
    return all.filter((r) => {
      const a = r.action;
      if (a.type === "family") {
        const f = familyById(a.familyId);
        return !!f && !(notes && !cellFromSubject(f.make({}, a.key)));
      }
      // a section is the notes creator's own
      if (a.type === "command" && a.command === "section-add") return notes;
      // the notes creator offers what can be a cell of a note, and the commands that add one (a section, a video)
      return !notes || (a.type === "add" && !!cellFromSubject(a.subject)) || (a.type === "command" && isNoteCommand(a.command));
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resultsFor reads exactly these
  const { rows, flat } = useMemo(() => rowsOf(resultsFor(query), !!query.trim()), [query, pluginIds, stageKey, media, notes]);

  /** the stage's widgets by family, in stage order */
  const byFamily = useMemo(() => {
    const m = new Map<string, Layer[]>();
    for (const l of layers) {
      const id = familyOf(l.subject)?.id;
      if (id) m.set(id, [...(m.get(id) ?? []), l]);
    }
    return m;
  }, [layers]);

  /** the stage's widgets by identity: a row is ticked when one with its identity is there, whatever its key */
  const onStage = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const l of layers) m.set(subjectIdentity(l.subject), [...(m.get(subjectIdentity(l.subject)) ?? []), l.id]);
    return m;
  }, [layers]);
  const idsOf = (r: PaletteResult) => (r.action.type === "add" && r.action.subject.kind !== "text" ? onStage.get(subjectIdentity(r.action.subject)) ?? [] : []);

  useEffect(() => input.current?.focus(), []);
  // the list is long: keep the active row in view while ↑ ↓ move through it
  useEffect(() => {
    list.current?.querySelector(`[aria-selected="true"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const collapse = () => {
    setOpen(null);
    setEditing(null);
    input.current?.focus();
  };

  /** the open family's new widget on the stage, pinned where its key differs from the master; the family stays open, the widget under it */
  const addOpen = () => {
    if (!open) return;
    const { family, key, values } = open;
    const made = family.make(addableValues(values), key);
    onPick({ id: `family:${family.id}`, label: family.title, detail: "", group: family.group, action: { type: "add", subject: pinAgainst(made, stageKey, key) } });
    input.current?.focus();
  };

  /** a row picked (click, or Enter in the search): what it does is `paletteChoice` */
  const pick = (r: PaletteResult | undefined, enter = false) => {
    if (!r) return;
    const choice = paletteChoice(r, { enter, openFamily: open?.family.id ?? null, onStage: idsOf(r).length > 0 });
    if (choice === "add-open") addOpen();
    else if (choice === "collapse") collapse();
    else if (choice === "open") {
      setOpen(opened(r));
      setEditing(null);
    } else if (choice === "command") {
      onPick(r);
      onClose();
      return;
    } else if (choice === "remove") idsOf(r).forEach(onRemove);
    else onPick(r);
    input.current?.focus();
  };

  const familyPanel = (o: Open) => {
    const widgets = byFamily.get(o.family.id) ?? [];
    return (
      <div id={`family-panel-${o.family.id}`} role="group" aria-label={`${o.family.title}: options and widgets on the stage`} className="mx-2 mb-1 rounded-md border border-slate-800 bg-slate-950/40">
        <FamilyStep
          family={o.family}
          values={o.values}
          onValues={(values) => setOpen((s) => (s ? { ...s, values } : s))}
          onSubmit={addOpen}
        />
        <div className="flex justify-end px-4 pb-2">
          <button type="button" onClick={addOpen} className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500">
            Add to stage
          </button>
        </div>
        {widgets.length > 0 && (
          <ul aria-label={`${o.family.title} on the stage`} className="border-t border-slate-800 py-1">
            {widgets.map((l) => {
              const editOpen = editing === l.id;
              return (
                <li key={l.id} className="px-2 py-0.5">
                  <div className={`flex items-center gap-1 rounded-md ${editOpen ? "bg-slate-800/60" : ""}`}>
                    <button
                      type="button"
                      aria-expanded={editOpen}
                      onClick={() => setEditing(editOpen ? null : l.id)}
                      title={editOpen ? "Close its options" : "Change its options"}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-100 hover:bg-slate-800"
                    >
                      <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center text-slate-500"><Icon name={editOpen ? "chevron-down" : "pencil"} size={12} /></span>
                      <span className="truncate">{describeSubject(l.subject)}</span>
                    </button>
                    <button type="button" aria-label="Take it off the stage" title="Take it off the stage" onClick={() => onRemove(l.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                  {/* keyed by the layer: a fresh form for each widget opened */}
                  {editOpen && <FamilyEditor key={l.id} subject={l.subject} onUpdate={(s) => onUpdate(l.id, s)} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return createPortal(
    <div data-chrome className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 pt-[10vh]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-label="Widgets on the stage"
        className="flex w-[min(600px,92vw)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onKeyDown={(e) => {
          // the studio's shortcuts listen on window: keys typed here (Escape and Enter too) stay here
          e.stopPropagation();
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (open) collapse();
          else onClose();
        }}
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            const q = e.target.value;
            setQuery(q);
            setActive(0);
            setEditing(null);
            // a key alone ("a dorian", "ionian") lists only families: the first opens
            const next = resultsFor(q);
            const onlyFamilies = q.trim() !== "" && next.length > 0 && next.every((r) => r.action.type === "family");
            setOpen(onlyFamilies ? opened(rowsOf(next, true).flat[0]) : null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(flat.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(flat[active], true);
            }
          }}
          placeholder="Search: scale, a dorian, pent pos 2, e shape, sus iv, metronome, camera…"
          className="w-full border-b border-slate-800 bg-transparent px-4 py-3 font-mono text-base text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Search"
        />
        <div className="max-h-[64vh] overflow-auto">
          <ul ref={list} role="listbox" aria-multiselectable className="py-1">
            {flat.length === 0 && <li className="px-4 py-2 text-sm text-slate-500">Nothing for that. Try a widget name, a key (a dorian) or a command.</li>}
            {rows.flatMap((row, k) => {
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
              const fam = r.action.type === "family" ? r.action.familyId : null;
              const expanded = !!fam && open?.family.id === fam;
              const count = fam ? (byFamily.get(fam)?.length ?? 0) : 0;
              const on = idsOf(r).length > 0;
              const option = (
                <li
                  key={r.id}
                  role="option"
                  aria-selected={i === active}
                  aria-checked={r.action.type === "add" ? on : undefined}
                  className="px-2 py-0.5"
                >
                  <button
                    type="button"
                    aria-expanded={fam ? expanded : undefined}
                    aria-controls={expanded ? `family-panel-${fam}` : undefined}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => {
                      setActive(i);
                      pick(r);
                    }}
                    title={r.action.type === "command" ? undefined : fam ? (expanded ? "Close its options" : "Click for its options and its widgets on the stage") : on ? "On the stage: click to take it off" : "Click to put it on the stage"}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ring-1 ${on ? "ring-emerald-500/70" : "ring-transparent"} ${i === active ? "bg-sky-500/15 text-sky-100" : on ? "bg-emerald-500/5 text-slate-100" : "text-slate-200"}`}
                  >
                    {r.action.type === "add" ? (
                      <span aria-hidden className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-600"}`}>
                        {on && <Icon name="check" size={12} />}
                      </span>
                    ) : (
                      <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center text-slate-500"><Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} /></span>
                    )}
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate">{r.label}</span>
                      {count > 0 && (
                        <span title={`${count} on the stage`} className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                          {count}<span className="sr-only"> on the stage</span>
                        </span>
                      )}
                      {r.action.type === "add" && isControl(r.action.subject) && <ControlBadge />}
                      {r.action.type === "add" && isPage(r.action.subject) && <PageBadge />}
                      {r.action.type === "add" && takesMic(r.action.subject) && <MicBadge />}
                    </span>
                    {r.detail && <span className="shrink-0 truncate text-xs text-slate-500">{r.detail}</span>}
                  </button>
                </li>
              );
              return expanded && open ? [option, <li key={`${r.id}:panel`} role="presentation">{familyPanel(open)}</li>] : [option];
            })}
          </ul>
        </div>
        <p className="border-t border-slate-800 px-4 py-1.5 text-[11px] text-slate-500">
          {open
            ? `Enter adds ${open.family.title} to the stage (in the search or on an option) · Space toggles an option · Esc closes its options`
            : "Click: a widget goes on or comes off · Enter adds · a family opens · Esc closes"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
