"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { copyNotesMarkdown, noteHref, outdatedCount, repinCopyNotes, squeeze } from "../model/copyNotes";
import { useCommits, useCopyNotes, useLinkedNote, useShownSections, writeCopyNotes as write } from "./store";
import { devUi } from "../gate";

const ROOT = "data-copy-notes";
const whereOf = (el: Element) => {
  const label = el.getAttribute("aria-label");
  return `${el.tagName.toLowerCase()}${label ? ` "${label}"` : el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/)[0]}` : ""}`;
};

/** The buttons of the bar on /dev/examples, so the notes read as the same tool. */
const BTN = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";
const PRIMARY = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/70 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-500/30";

/**
 * Dev only. A button at the bottom right opens the notes bar, the same on every page: every note's count (and, where the
 * page shows example sections, how many are on changed ones), HEAD, note a text, re-pin all to HEAD, clear all, copy all;
 * then this page's notes. Opening the bar turns on note mode ("Note a text" toggles it): hover outlines the text under the pointer, a click (which
 * does nothing else then) opens a box for a note on that wording, tagged inline above its text. The pencils on
 * /dev/examples' sections add to the same notes. All pages' notes are on /dev/notes.
 */
export default function CopyNotes() {
  const path = usePathname();
  const notes = useCopyNotes();
  const commits = useCommits();
  const head = commits?.head ?? null;
  const shown = useShownSections();
  const linked = useLinkedNote();
  const scrolled = useRef<string | null>(null);
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ text: string; where: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const hot = useRef<HTMLElement | null>(null);
  const [marks, setMarks] = useState<{ id: string; note: string; top: number; left: number }[]>([]);
  const here = notes.filter((n) => n.route === path);

  useEffect(() => {
    if (!on) return;
    const textEl = (e: Event) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || el.closest(`[${ROOT}]`)) return null;
      return (el.closest("button,a,label,summary,h1,h2,h3,h4,h5,h6,p,li,span,div") as HTMLElement | null) && (el as HTMLElement);
    };
    // the innermost element that holds text of its own, so a click on a card names its line, not the whole card
    const pick = (e: Event) => {
      let el = textEl(e);
      while (el && !squeeze(el.innerText ?? "")) el = el.parentElement;
      return el;
    };
    const over = (e: MouseEvent) => {
      const el = pick(e);
      if (hot.current) hot.current.style.outline = "";
      hot.current = el;
      if (el) el.style.outline = "2px dashed #fbbf24";
    };
    const click = (e: MouseEvent) => {
      const el = pick(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setTarget({ text: squeeze(el.innerText), where: whereOf(el) });
      setDraft("");
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && (setTarget(null), setOn(false));
    document.addEventListener("mouseover", over, true);
    document.addEventListener("click", click, true);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mouseover", over, true);
      document.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key);
      if (hot.current) hot.current.style.outline = "";
      hot.current = null;
    };
  }, [on]);

  // the notes of this page, tagged above the text they are about; found again by the text, so they follow layout changes
  useEffect(() => {
    if (!devUi()) return;
    // section notes are shown under their sections (/dev/examples), not tagged
    const mine = notes.filter((n) => n.route === path && !n.section);
    if (!mine.length) return;
    const scan = () => {
      const els = [...document.body.querySelectorAll<HTMLElement>("*")].filter((el) => !el.closest(`[${ROOT}]`));
      const next = mine.flatMap((n) => {
        const el = els.filter((e) => squeeze(e.innerText ?? "") === n.text).pop();
        const r = el?.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0 ? [{ id: n.id, note: n.note, top: Math.round(r.top), left: Math.round(r.left) }] : [];
      });
      setMarks((m) => (JSON.stringify(m) === JSON.stringify(next) ? m : next));
      // a link to one of these notes: bring its text into view, once
      const target = linked && scrolled.current !== linked && mine.find((n) => n.id === linked);
      if (target) {
        const el = els.filter((e) => squeeze(e.innerText ?? "") === target.text).pop();
        if (el) {
          el.scrollIntoView({ block: "center" });
          scrolled.current = linked;
        }
      }
    };
    scan();
    const timer = setInterval(scan, 500);
    window.addEventListener("scroll", scan, true);
    window.addEventListener("resize", scan);
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", scan, true);
      window.removeEventListener("resize", scan);
    };
  }, [notes, path, linked]);

  if (!devUi()) return null;

  const save = () => {
    const note = draft.trim();
    if (target && note) write((l) => [...l, { id: crypto.randomUUID(), route: path, ...target, note, at: new Date().toISOString(), ...(head ? { head } : {}) }]);
    setTarget(null);
  };
  const outdated = shown ? outdatedCount(notes, shown.hashes) : 0;
  const repin = () => head && write((l) => (shown ? shown.repin(repinCopyNotes(l, head), commits?.files) : repinCopyNotes(l, head)));
  const copy = () =>
    void navigator.clipboard.writeText(copyNotesMarkdown(notes, { head: head ?? undefined, files: commits?.files, hashes: shown?.hashes })).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <>
      <div {...{ [ROOT]: "" }} className="pointer-events-none fixed inset-0 z-[1999]">
        {(here.some((n) => !n.section) ? marks : []).map((m) => (
          <div key={m.id} title={m.note} style={{ top: Math.max(0, m.top - 16), left: Math.max(0, m.left) }} className={`pointer-events-auto absolute flex max-w-56 items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium leading-4 text-slate-950 shadow ${m.id === linked ? "bg-sky-300 ring-2 ring-sky-400" : "bg-amber-400"}`}>
            <span className="truncate">{m.note}</span>
            <button type="button" aria-label="Delete note" onClick={() => write((l) => l.filter((x) => x.id !== m.id))} className="cursor-pointer opacity-60 hover:opacity-100"><Icon name="x" size={10} /></button>
          </div>
        ))}
      </div>
      <div {...{ [ROOT]: "" }} className="fixed bottom-3 right-3 z-[2000] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 text-sm">
        {target && (
          <div className="flex w-80 max-w-full flex-col gap-1.5 rounded-2xl border border-amber-400/40 bg-slate-950/95 p-3 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur">
            <p className="text-xs text-slate-400">“{target.text}”</p>
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()}
              placeholder="Your note (⌘↵ saves, Esc leaves)"
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <button type="button" onClick={save} className={PRIMARY}>Save</button>
              <button type="button" onClick={() => setTarget(null)} className={BTN}>Cancel</button>
            </div>
          </div>
        )}
        {open && !target && (
          <div className="w-[56rem] max-w-full rounded-2xl border border-amber-400/40 bg-slate-950/95 px-4 py-2.5 text-slate-200 shadow-2xl shadow-black/50 backdrop-blur" onMouseLeave={() => setClearing(false)}>
            <div className="flex flex-wrap items-center gap-3">
              <Icon name="pencil" size={14} className="text-amber-300" />
              <span className="text-sm text-slate-100">{notes.length} note{notes.length === 1 ? "" : "s"}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{here.length} on this page</span>
              {outdated > 0 && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">{outdated} on changed sections</span>}
              {head && <span className="font-mono text-xs text-slate-500" title="The checkout's HEAD; a section note also keeps its example file's commit">HEAD {head}</span>}
              <span className="ml-auto flex flex-wrap gap-2">
                <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} title={on ? "On: click any text on the page to note it" : "Turn on, then click any text on the page to note it"} className={on ? PRIMARY : BTN}><Icon name="pencil" size={12} />Note a text</button>
                <button type="button" disabled={!head || !notes.length} onClick={repin} title={`Pin every note to the checkout's HEAD: they still hold${shown ? "; section notes also to their sections as they are now (those on gone sections stay)" : ". Section notes are pinned to their sections as they are now only from /dev/examples"}`} className={BTN}>Re-pin all to HEAD</button>
                <button type="button" disabled={!notes.length} onClick={() => (clearing ? (write(() => []), setClearing(false)) : setClearing(true))} className={`${BTN} ${clearing ? "!border-rose-400 !bg-rose-500/20 !text-rose-100" : ""}`}>{clearing ? "Click again to delete all" : "Clear all"}</button>
                <button type="button" disabled={!notes.length} onClick={copy} className={copied ? `${PRIMARY} !border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100` : PRIMARY}><Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy all notes"}</button>
              </span>
            </div>
            {here.length > 0 && (
              <div className="mt-2 max-h-64 overflow-auto border-t border-slate-800">
                {here.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 border-b border-slate-800 py-1.5 text-xs last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-400">{n.section ? <span className="font-mono text-slate-500">{n.where} · </span> : null}“{n.text}”</p>
                      <p className="whitespace-pre-wrap">{n.note}</p>
                    </div>
                    <Link href={noteHref(n, "/dev/notes")} title="This note in all notes" className="shrink-0 text-sky-300 opacity-70 hover:opacity-100">all notes →</Link>
                    <button type="button" aria-label="Delete note" onClick={() => write((l) => l.filter((x) => x.id !== n.id))} className="cursor-pointer opacity-60 hover:opacity-100"><Icon name="x" size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dev/notes" className="mt-2 inline-block text-xs text-sky-300 underline-offset-2 hover:underline">All pages&apos; notes →</Link>
          </div>
        )}
        <button
          type="button"
          onClick={() => (open || on ? (setOpen(false), setOn(false)) : (setOpen(true), setOn(true)))}
          title="Notes on the wording of this page"
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/50 px-3.5 py-2 text-xs font-semibold shadow-lg ${on ? "bg-amber-400 text-slate-950" : "bg-slate-950/95 text-amber-100"}`}
        >
          <Icon name="pencil" size={12} />{on && !open ? "Click a text · Esc" : notes.length ? `Notes · ${here.length}/${notes.length}` : "Notes"}
        </button>
      </div>
    </>
  );
}
