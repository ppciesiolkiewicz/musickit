"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import type { KeyChoice } from "@/features/creator";
import ControlBadge, { MicBadge, PageBadge } from "./ControlBadge";
import { isLive } from "./notes";
import FamilyStep, { FamilyEditor, moreOf } from "./FamilyStep";
import {
  FAMILIES, PALETTE_GROUPS, addableValues, describeSubject, familyOf, groupResults, isControl, isPage, paletteCatalog, pinAgainst, takesMic, searchPalette, stepValues,
  subjectIdentity, withMore, type Family, type FamilyValues, type Layer, type MediaState, type PaletteResult, type Subject,
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

/** Step two: a family's props being picked for a new widget in `key`. */
interface Step {
  family: Family;
  key: KeyChoice;
  another: boolean;
  /** the key in words, as the row showed it */
  detail?: string;
  values: FamilyValues;
  moreText: Record<string, string>;
}

const familyById = (id: string) => FAMILIES.find((f) => f.id === id);

/**
 * The widget picker over the studio. On top, **On the stage**: each family widget there by its row text, an accordion to edit its
 * props in place and a remove button. Below, every widget by section, ticked when it is on the stage: click a row (or Enter) to
 * put it on the stage or take it off; it stays open, so several can be ticked at once. A family row opens step two in the same
 * dialog (its props; Enter adds, Esc or Back returns). Typing searches; Escape or a click outside closes. A studio command (camera,
 * screen share) runs and closes. Rendered on document.body, so it is never inside the recorded frame.
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
  /** a widget on the stage edited in its accordion */
  onUpdate: (layerId: string, subject: Subject) => void;
  onRemove: (layerId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [step, setStep] = useState<Step | null>(null);
  /** the on-stage row whose accordion is open */
  const [open, setOpen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  /** the families with a widget on the stage: only they offer "Add another" */
  const familiesOnStage = useMemo(() => new Set(layers.flatMap((l) => familyOf(l.subject)?.id ?? [])), [layers]);
  const staged = useMemo(() => layers.filter((l) => describeSubject(l.subject) !== null), [layers]);

  const { rows, flat } = useMemo(() => {
    const q = query.trim();
    const all = q ? searchPalette(q, pluginIds, stageKey, media) : paletteCatalog(pluginIds, stageKey, media);
    const shown = all.filter((r) => {
      const a = r.action;
      if (a.type === "family") {
        if (a.another && !familiesOnStage.has(a.familyId)) return false;
        const f = familyById(a.familyId);
        return !!f && !(notes && isLive(f.make({}, a.key)));
      }
      return !notes || (a.type === "add" && !isLive(a.subject));
    });
    return rowsOf(shown, !!q);
  }, [query, pluginIds, stageKey, media, notes, familiesOnStage]);

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

  const back = () => {
    setStep(null);
    input.current?.focus();
  };

  /** step two's widget on the stage, pinned where its key differs from the master; back to step one */
  const addStep = () => {
    if (!step) return;
    const { more, invalid } = moreOf(step.family, step.moreText);
    for (const name of invalid) delete more[name];
    const made = withMore(step.family.make(addableValues(step.values), step.key), more).subject;
    onPick({ id: `family:${step.family.id}`, label: step.family.title, detail: step.detail ?? "", group: step.family.group, action: { type: "add", subject: pinAgainst(made, stageKey, step.key) } });
    back();
  };

  const toggle = (r: PaletteResult | undefined) => {
    if (!r) return;
    if (r.action.type === "family") {
      const { familyId, key, another = false } = r.action;
      const family = familyById(familyId);
      if (family) setStep({ family, key, another, detail: r.detail, values: stepValues(family, key, another), moreText: {} });
      input.current?.focus();
      return;
    }
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
      <div
        role="dialog"
        aria-label="Widgets on the stage"
        className="flex w-[min(600px,92vw)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onKeyDown={(e) => {
          // the studio's shortcuts listen on window: keys typed here (Escape and Enter too) stay here
          e.stopPropagation();
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (step) back();
          else onClose();
        }}
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setStep(null);
          }}
          onKeyDown={(e) => {
            if (step) {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep();
              }
              return;
            }
            if (e.key === "ArrowDown") {
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
        {step ? (
          <div role="group" aria-label={step.family.title} className="max-h-[64vh] overflow-auto py-1">
            <div className="px-2 py-0.5">
              <button type="button" onClick={back} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800">
                <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center text-slate-500"><Icon name="chevron-left" size={12} /></span>
                Back
              </button>
            </div>
            <div className="flex items-baseline gap-2 px-4 pb-1 pt-1.5">
              <span className="text-sm font-semibold text-slate-100">{step.another ? `Add another: ${step.family.title}` : step.family.title}</span>
              <span className="text-xs text-slate-500">{step.detail}</span>
            </div>
            <FamilyStep
              family={step.family}
              values={step.values}
              moreText={step.moreText}
              onValues={(values) => setStep((s) => (s ? { ...s, values } : s))}
              onMoreText={(moreText) => setStep((s) => (s ? { ...s, moreText } : s))}
              onSubmit={addStep}
            />
            <div className="flex justify-end px-4 pb-2 pt-1">
              <button type="button" onClick={addStep} className="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500">
                Add to the stage
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[64vh] overflow-auto">
            {!query.trim() && staged.length > 0 && (
              <section aria-label="On the stage" className="border-b border-slate-800 py-1">
                <h2 className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">On the stage</h2>
                <ul>
                  {staged.map((l) => {
                    const expanded = open === l.id;
                    return (
                      <li key={l.id} className="px-2 py-0.5">
                        <div className={`flex items-center gap-1 rounded-md ${expanded ? "bg-slate-800/60" : ""}`}>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setOpen(expanded ? null : l.id)}
                            title={expanded ? "Close its options" : "Change its options"}
                            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-100 hover:bg-slate-800"
                          >
                            <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center text-slate-500"><Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} /></span>
                            <span className="truncate">{describeSubject(l.subject)}</span>
                          </button>
                          <button type="button" aria-label="Take it off the stage" title="Take it off the stage" onClick={() => onRemove(l.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                        {/* keyed by the layer: a fresh form for each widget opened */}
                        {expanded && <FamilyEditor key={l.id} subject={l.subject} onUpdate={(s) => onUpdate(l.id, s)} />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <ul ref={list} role="listbox" aria-multiselectable className="py-1">
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
                      title={r.action.type === "command" ? undefined : r.action.type === "family" ? "Click to pick its options" : on ? "On the stage: click to take it off" : "Click to put it on the stage"}
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
                        {r.action.type === "add" && takesMic(r.action.subject) && <MicBadge />}
                      </span>
                      {r.detail && <span className="shrink-0 truncate text-xs text-slate-500">{r.detail}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="border-t border-slate-800 px-4 py-1.5 text-[11px] text-slate-500">
          {step ? "Enter puts it on the stage · Esc goes back" : "Click or Enter to put a widget on the stage or take it off · Esc closes"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
