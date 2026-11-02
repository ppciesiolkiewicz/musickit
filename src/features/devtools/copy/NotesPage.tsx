"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { clearCopyNotes, copyNotesMarkdown, noteHref, repinCopyNotes } from "../model/copyNotes";
import { useCommits, useCopyNotes, useLinkedNote, useScrollTo, writeCopyNotes as write } from "./store";
import { NoteBar } from "./NoteBar";

const BTN = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";
const PRIMARY = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/70 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-500/30";

/** The paths in /sitemap.xml; empty until it arrives (or when it can't be read). */
function useSitemapPaths(): string[] {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    fetch("/sitemap.xml")
      .then((r) => (r.ok ? r.text() : ""))
      .then((xml) => setPaths([...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))]), () => setPaths([]));
  }, []);
  return paths;
}

/** Copy button that shows a tick for a moment. */
function CopyButton({ text, label, primary = false, disabled = false }: { text: () => string; label: string; primary?: boolean; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      className={primary ? PRIMARY : BTN}
      onClick={() =>
        void navigator.clipboard.writeText(text()).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      <Icon name={done ? "check" : "copy"} size={12} />{done ? "Copied" : label}
    </button>
  );
}

/** Every page's copy notes, in the order of the sitemap, with the pages that have none yet below; copy, re-pin and clear them all or per page. */
export default function NotesPage() {
  const notes = useCopyNotes();
  const commits = useCommits();
  const head = commits?.head ?? null;
  const sitemap = useSitemapPaths();
  const [clearing, setClearing] = useState<string | null>(null);
  const linked = useLinkedNote();
  useScrollTo(linked && notes.some((n) => n.id === linked) ? `note-${linked}` : null);

  const byRoute = useMemo(() => {
    const m = new Map<string, typeof notes>();
    for (const n of notes) m.set(n.route, [...(m.get(n.route) ?? []), n]);
    const rank = (r: string) => (sitemap.includes(r) ? sitemap.indexOf(r) : sitemap.length);
    return [...m].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  }, [notes, sitemap]);
  const empty = sitemap.filter((p) => !byRoute.some(([r]) => r === p));
  const confirm = (key: string, run: () => void) => (clearing === key ? (run(), setClearing(null)) : setClearing(key));
  const danger = (key: string) => `${BTN} ${clearing === key ? "!border-rose-400 !bg-rose-500/20 !text-rose-100" : ""}`;

  return (
    <div className="flex flex-col gap-4" onMouseLeave={() => setClearing(null)}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/40 bg-slate-950/95 px-4 py-2.5">
        <Icon name="pencil" size={14} className="text-amber-300" />
        <span className="text-sm text-slate-100">{notes.length} note{notes.length === 1 ? "" : "s"} on {byRoute.length} page{byRoute.length === 1 ? "" : "s"}</span>
        {head && <span className="font-mono text-xs text-slate-500" title="The checkout's HEAD">HEAD {head}</span>}
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" disabled={!head || !notes.length} onClick={() => head && write((l) => repinCopyNotes(l, head))} title="Pin every note to the checkout's HEAD: they still hold" className={BTN}>Re-pin all to HEAD</button>
          <button type="button" disabled={!notes.length} onClick={() => confirm("all", () => write(() => []))} className={danger("all")}>{clearing === "all" ? "Click again to delete all" : "Clear all"}</button>
          <CopyButton primary disabled={!notes.length} label="Copy all" text={() => copyNotesMarkdown(notes, { head: head ?? undefined, files: commits?.files, origin: location.origin })} />
        </span>
      </div>

      {!notes.length && <p className="text-sm text-slate-400">No notes yet. Open any page in dev and use the Notes button at the bottom right.</p>}

      {byRoute.map(([route, list]) => (
        <section key={route} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={route} className="font-mono text-sm font-semibold text-sky-200 hover:underline">{route}</Link>
            <span className="text-xs text-slate-500">{list.length}</span>
            <span className="ml-auto flex flex-wrap gap-2">
              <button type="button" disabled={!head} onClick={() => head && write((l) => repinCopyNotes(l, head, route))} className={BTN}>Re-pin to HEAD</button>
              <button type="button" onClick={() => confirm(route, () => write((l) => clearCopyNotes(l, route)))} className={danger(route)}>{clearing === route ? "Click again to clear" : "Clear"}</button>
              <CopyButton label="Copy" text={() => copyNotesMarkdown(list, { head: head ?? undefined, files: commits?.files, origin: location.origin })} />
            </span>
          </div>
          <ul className="mt-2 divide-y divide-slate-800">
            {list.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 py-2 text-sm">
                <p className="flex gap-3 text-slate-400">
                  <span className="min-w-0 flex-1">“{n.text}”<span className="ml-2 font-mono text-[10px] text-slate-600">{n.where}{head && n.head && n.head !== head ? " · older HEAD" : ""}</span></span>
                  <Link href={noteHref(n)} title="Open the page at this note" className="shrink-0 text-xs text-sky-300 hover:underline">Open →</Link>
                </p>
                <NoteBar id={`note-${n.id}`} note={n} linked={n.id === linked} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {empty.length > 0 && (
        <details className="rounded-2xl border border-slate-800 p-4 text-sm text-slate-400">
          <summary className="cursor-pointer">{empty.length} sitemap pages without notes</summary>
          <ul className="mt-2 grid gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-2">
            {empty.map((p) => (
              <li key={p} className="truncate"><Link href={p} className="hover:text-sky-200 hover:underline">{p}</Link></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
