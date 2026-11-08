"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Chip } from "@/components/ui";
import { coverageVersion, listCoverage, subscribeCoverage, type CoverageEntry } from "./coverage";
import { COVERED_PAGES } from "./coveredPages";
import { LEVELS, atLeast, type Level } from "./levels";
import type { TourStep } from "./tour";
import { TOOL_TOURS } from "./toolTours";
import { useLevel } from "./useLevel";

const LABEL: Record<Level, string> = { simple: "Simple", standard: "Standard" };

type Row = { kind: "page" | "tool"; id: string; route?: string; tour: TourStep[] | null; seen: CoverageEntry | null };

/** Steps of a tour shown at `level` (its targets aside). */
const stepsAt = (tour: TourStep[], level: Level) => tour.filter((s) => !s.minLevel || atLeast(level, s.minLevel)).length;

/** The gaps a row shows: no tour, or (once seen) no tagged controls. */
function gaps(row: Row): string[] {
  const out: string[] = [];
  if (!row.tour?.length) out.push("no tour");
  if (row.seen && !row.seen.levels.length) out.push("no level tags");
  return out;
}

function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-slate-800 px-3 py-2 align-top ${className}`}>{children}</td>;
}

function Levels({ entry, preview }: { entry: CoverageEntry; preview: Level }) {
  if (!entry.levels.length) return <span className="text-slate-500">none</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entry.levels.map((l) => {
        const hidden = !atLeast(preview, l);
        return (
          <span
            key={l}
            title={hidden ? `Controls tagged ${LABEL[l]} are hidden at ${LABEL[preview]}` : `Controls tagged ${LABEL[l]} show at ${LABEL[preview]}`}
            className={`rounded px-1.5 py-0.5 text-xs ${hidden ? "bg-slate-800 text-slate-500 line-through" : "bg-sky-500/15 text-sky-200"}`}
          >
            {LABEL[l]}
          </span>
        );
      })}
    </span>
  );
}

function Table({ title, rows, preview, unseen }: { title: string; rows: Row[]; preview: Level; unseen: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-light text-slate-100">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Id</th>
              <th className="px-3 py-2 font-medium">Tagged levels</th>
              <th className="px-3 py-2 font-medium">Tour</th>
              <th className="px-3 py-2 font-medium">Hints</th>
              <th className="px-3 py-2 font-medium">Gaps</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const g = gaps(r);
              return (
                <tr key={r.id} className={g.length ? "bg-rose-500/10" : ""}>
                  <Cell className="font-mono text-xs text-slate-200">
                    {r.route ? <Link href={r.route} className="text-sky-300 hover:underline">{r.id}</Link> : r.id}
                    {r.route && <span className="ml-2 text-slate-500">{r.route}</span>}
                  </Cell>
                  <Cell>{r.seen ? <Levels entry={r.seen} preview={preview} /> : <span className="italic text-slate-500">{unseen}</span>}</Cell>
                  <Cell>
                    {r.tour?.length ? (
                      <span>
                        {r.tour.length} steps
                        <span className="text-slate-500"> · {stepsAt(r.tour, preview)} at {LABEL[preview]}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">none</span>
                    )}
                  </Cell>
                  <Cell>{r.seen ? r.seen.hints || <span className="text-slate-500">0</span> : <span className="text-slate-600">–</span>}</Cell>
                  <Cell>
                    {g.length ? (
                      <span className="flex flex-wrap gap-1">
                        {g.map((x) => <span key={x} className="rounded bg-rose-500/20 px-1.5 py-0.5 text-xs font-semibold text-rose-200">{x}</span>)}
                      </span>
                    ) : r.seen ? (
                      <span className="text-emerald-300/80">ok</span>
                    ) : (
                      <span className="text-slate-600">–</span>
                    )}
                  </Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * /dev/onboarding: what the guide covers, per page and per exercise tool. Tours come from the static tour files; tagged
 * levels and hints from what has rendered this session (`registerCoverage`), so a page not opened yet reads "not yet
 * visited". The level switch is the real global level, so the pages and tools open in it.
 */
export default function CoverageView() {
  const version = useSyncExternalStore(subscribeCoverage, coverageVersion, () => 0);
  const seen = useMemo(() => (version >= 0 ? listCoverage() : []), [version]);
  const { global, setGlobal } = useLevel();
  const find = (kind: Row["kind"], id: string) => seen.find((e) => e.kind === kind && e.id === id) ?? null;

  const pages: Row[] = [
    ...COVERED_PAGES.map((p) => ({ kind: "page" as const, id: p.id, route: p.route, tour: p.tour, seen: find("page", p.id) })),
    ...seen.filter((e) => e.kind === "page" && !COVERED_PAGES.some((p) => p.id === e.id)).map((e) => ({ kind: "page" as const, id: e.id, tour: null, seen: e })),
  ];
  const tools: Row[] = [
    ...Object.entries(TOOL_TOURS).map(([id, tour]) => ({ kind: "tool" as const, id, tour, seen: find("tool", id) })),
    ...seen.filter((e) => e.kind === "tool" && !(e.id in TOOL_TOURS)).map((e) => ({ kind: "tool" as const, id: e.id, tour: null, seen: e })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const gapCount = [...pages, ...tools].filter((r) => gaps(r).length).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
        <span className="text-slate-400">Preview level</span>
        <div role="group" aria-label="Preview level" className="flex gap-1">
          {LEVELS.map((l) => <Chip key={l} on={global === l} onClick={() => setGlobal(l)} title={`${LABEL[l]} on every page`}>{LABEL[l]}</Chip>)}
        </div>
        <span className="text-slate-500">
          Sets the global level, so pages and tools open in it. Tags above it show struck through.
        </span>
        <span className={`ml-auto rounded px-2 py-0.5 text-xs font-semibold ${gapCount ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/15 text-emerald-200"}`}>
          {gapCount ? `${gapCount} with gaps` : "no gaps so far"}
        </span>
      </div>
      <p className="max-w-3xl text-sm text-slate-400">
        Tours are read from the tour files. Tagged levels and hints are registered as pages and tools render, in this tab
        only: open a page from its link (or the tools on <Link href="/plan" className="text-sky-300 hover:underline">/plan</Link> or{" "}
        <Link href="/dev/stories" className="text-sky-300 hover:underline">Component stories</Link>) and come back here
        without reloading.
      </p>
      <Table title="Pages" rows={pages} preview={global} unseen="not yet visited" />
      <Table title="Exercise tools" rows={tools} preview={global} unseen="not yet seen" />
    </div>
  );
}
