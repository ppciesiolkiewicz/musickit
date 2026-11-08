"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { contextLines, copyNotesMarkdown, noteHref, outdatedCount, repinCopyNotes, squeeze, type CopyNote, type NoteContext } from "../model/copyNotes";
import { useCommits, useCopyNotes, useLinkedNote, useRoute, useShownSections, writeCopyNotes as write } from "./store";
import { devUi } from "../gate";
import { NoteBar } from "./NoteBar";
import { TextNoteMarks, pathOf, placesOf } from "./TextNoteMarks";
import { contextOf, sourcesOf } from "./context";

const ROOT = "data-copy-notes";
const whereOf = (el: Element) => {
  const label = el.getAttribute("aria-label");
  return `${el.tagName.toLowerCase()}${label ? ` "${label}"` : el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/)[0]}` : ""}`;
};

/** The blocks a note can be on: text blocks, lists and plain boxes; not page regions (nav, main, section) or SVG. */
const BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,ul,ol,dl,dt,dd,div,span,blockquote,pre,td,th,caption,figcaption,label,legend,summary,button,a";
const inline = (el: Element) => getComputedStyle(el).display === "inline";

/** Whether `el` holds text itself: a text node of its own, or one in an inline child (a <strong> or <a> in a <p>), not
 * only in child blocks. */
function holdsText(el: Element): boolean {
  return [...el.childNodes].some((c) =>
    c.nodeType === Node.TEXT_NODE ? !!c.textContent?.trim() : c instanceof HTMLElement && inline(c) && !c.matches("svg,img") && !!c.innerText?.trim() && (holdsText(c) || !c.children.length),
  );
}

/** The block a click on `target` notes: the nearest one round it, itself not inline (an inline bit is its block's), that
 * holds text itself; none on a page region's padding or a wrapper of other blocks. */
function blockOf(target: EventTarget | null): HTMLElement | null {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.closest(`[${ROOT}]`)) return null;
    if (el instanceof HTMLElement && el.matches(BLOCKS) && !inline(el) && holdsText(el)) return el;
  }
  return null;
}

/** The buttons of the bar on /dev/examples, so the notes read as the same tool. */
const BTN = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50";
const PRIMARY = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/70 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-500/30";

/**
 * Dev only. A button at the bottom right opens the notes bar, the same on every page: every note's count (and, where the
 * page shows example sections, how many are on changed ones), HEAD, note a text, re-pin all to HEAD, clear all, copy all;
 * "N on this page" opens a modal with this page's notes. On the page, each text note marks its text (`TextNoteMarks`). Opening the bar turns on
 * note mode ("Note a text" toggles it): hover outlines the block under the pointer (`blockOf`: a text block, list or box that holds text itself),
 * a click (which does nothing else then) opens a box for a note on it, keeping its text and its place in the page. The A key
 * (outside a text box) toggles note mode too. The pencils on /dev/examples' sections add to the same notes. All pages' notes are on /dev/notes.
 */
export default function CopyNotes() {
  const pathname = usePathname();
  // the path and the hash: on a page that moves by its hash (/dev/stories) each place keeps its own notes
  const path = useRoute() || pathname;
  const notes = useCopyNotes();
  const commits = useCommits();
  const head = commits?.head ?? null;
  const shown = useShownSections();
  const linked = useLinkedNote();
  const scrolled = useRef<string | null>(null);
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const [target, setTarget] = useState<{ text: string; where: string; path: string; context: NoteContext } | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  // the note a mark on the page opened the modal at
  const [picked, setPicked] = useState<string | null>(null);
  const hot = useRef<HTMLElement | null>(null);
  // whether anything of the notes UI is showing, for the N key
  const shut = useRef(false);
  shut.current = open || on || list;
  // section notes are kept by the path alone: their sections pin them
  const onHere = (n: CopyNote) => n.route === (n.section ? pathname : path);
  const here = notes.filter(onHere);

  useEffect(() => {
    if (!on) return;
    const pick = (e: Event) => blockOf(e.target);
    const over = (e: MouseEvent) => {
      const el = pick(e);
      if (hot.current) hot.current.style.outline = "";
      hot.current = el;
      if (el) el.style.outline = "2px dashed #fbbf24";
    };
    const click = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(`[${ROOT}]`)) return;
      // in note mode a click on the page only notes: one that hits no block does nothing
      e.preventDefault();
      e.stopPropagation();
      const el = pick(e);
      if (!el) return;
      const text = squeeze(el.innerText);
      const path = pathOf(el, ROOT);
      setTarget({ text, where: whereOf(el), path, context: contextOf(el, text, ROOT) });
      // the JSX's file and line come a moment later, from the dev server's source maps
      void sourcesOf(el).then((src) => setTarget((t) => (t && t.path === path && t.text === text ? { ...t, context: { ...t.context, ...src } } : t)));
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

  // A (no modifier, not while typing) turns note mode on and off, the "Note a text" button from the keyboard; N opens and closes the notes
  useEffect(() => {
    if (!devUi()) return;
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k !== "a" && k !== "n") || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input,textarea,select"))) return;
      if (k === "a") return void setOn((v) => !v);
      // N opens or closes the notes panel; closing also leaves note mode and the list
      if (shut.current) (setOpen(false), setOn(false), setList(false), setTarget(null));
      else setOpen(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // the modal with this page's notes: Esc closes it (and only it, not note mode)
  useEffect(() => {
    if (!list) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setList(false));
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [list]);

  // a link to one of this page's notes: open the notes modal, where it is marked, and bring its text into view, once (the
  // text may render late, so look again until it is there); section notes are scrolled to by /dev/examples
  useEffect(() => {
    if (!devUi() || !linked || scrolled.current === linked) return;
    const note = notes.find((n) => n.id === linked && onHere(n));
    if (!note) return;
    setOpen(true);
    setList(true);
    if (note.section) return void (scrolled.current = linked);
    const find = () => {
      const el = placesOf(note, ROOT).pop();
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      scrolled.current = linked;
      clearInterval(timer);
    };
    const timer = setInterval(find, 500);
    find();
    return () => clearInterval(timer);
  }, [notes, path, pathname, linked]); // eslint-disable-line react-hooks/exhaustive-deps -- onHere is made of path and pathname

  if (!devUi()) return null;

  const save = () => {
    const note = draft.trim();
    if (target && note) write((l) => [...l, { id: crypto.randomUUID(), route: path, ...target, note, at: new Date().toISOString(), ...(head ? { head } : {}) }]);
    setTarget(null);
  };
  const outdated = shown ? outdatedCount(notes, shown.hashes) : 0;
  const repin = () => head && write((l) => (shown ? shown.repin(repinCopyNotes(l, head), commits?.files) : repinCopyNotes(l, head)));
  const copy = () =>
    void navigator.clipboard.writeText(copyNotesMarkdown(notes, { head: head ?? undefined, files: commits?.files, hashes: shown?.hashes, origin: location.origin })).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <>
      <TextNoteMarks notes={here} root={ROOT} onOpen={(id) => (setOpen(true), setList(true), setPicked(id))} />
      {list && (
        <div {...{ [ROOT]: "" }} onClick={() => setList(false)} className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="This page's notes" onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-[44rem] max-w-full flex-col rounded-2xl border border-amber-400/40 bg-slate-950 text-slate-200 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
              <Icon name="pencil" size={14} className="text-amber-300" />
              <span className="text-sm text-slate-100">{here.length} note{here.length === 1 ? "" : "s"} on this page</span>
              <Link href="/dev/notes" className="ml-auto text-xs text-sky-300 underline-offset-2 hover:underline">All pages&apos; notes →</Link>
              <button type="button" aria-label="Close" onClick={() => setList(false)} className="cursor-pointer text-slate-400 hover:text-slate-100"><Icon name="x" size={14} /></button>
            </div>
            <div className="overflow-auto px-4 py-1">
              {here.length ? here.map((n) => (
                <div key={n.id} className="flex flex-col gap-1 border-b border-slate-800 py-2 text-xs last:border-0">
                  <p className="flex gap-2 text-slate-400">
                    <span className="min-w-0 flex-1 truncate" title={n.text}>{n.section ? <span className="font-mono text-slate-500">{n.where} · </span> : null}“{n.text}”</span>
                    <Link href={noteHref(n, "/dev/notes")} title="This note in all notes" className="shrink-0 text-sky-300 opacity-70 hover:opacity-100">all notes →</Link>
                  </p>
                  <NoteBar note={n} linked={n.id === linked || n.id === picked} />
                </div>
              )) : <p className="py-3 text-xs text-slate-500">No notes on this page.</p>}
            </div>
          </div>
        </div>
      )}
      <div {...{ [ROOT]: "" }} className="fixed bottom-3 right-3 z-[2000] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 text-sm">
        {target && (
          <div className="flex w-80 max-w-full flex-col gap-1.5 rounded-2xl border border-amber-400/40 bg-slate-950/95 p-3 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur">
            <p className="text-xs text-slate-400">“{target.text}”</p>
            {contextLines(target.context).length > 0 && <p className="whitespace-pre-line break-words font-mono text-[10px] text-slate-500" title="Saved with the note, for whoever reads it">{contextLines(target.context).join("\n")}</p>}
            <textarea
              autoFocus
              rows={6}
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
              <button type="button" disabled={!here.length} onClick={() => (setPicked(null), setList(true))} title="This page's notes" className="cursor-pointer rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100 disabled:cursor-default disabled:hover:bg-slate-800 disabled:hover:text-slate-300">{here.length} on this page{here.length ? " →" : ""}</button>
              {outdated > 0 && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">{outdated} on changed sections</span>}
              {head && <span className="font-mono text-xs text-slate-500" title="The checkout's HEAD; a section note also keeps its example file's commit">HEAD {head}</span>}
              <span className="ml-auto flex flex-wrap gap-2">
                <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} title={on ? "On: click any text on the page to note it (A turns it off)" : "Turn on, then click any text on the page to note it (or press A)"} className={on ? PRIMARY : BTN}><Icon name="pencil" size={12} />Note a text<kbd className="rounded border border-current px-1 font-mono text-[10px] opacity-70">A</kbd></button>
                <button type="button" disabled={!head || !notes.length} onClick={repin} title={`Pin every note to the checkout's HEAD: they still hold${shown ? "; section notes also to their sections as they are now (those on gone sections stay)" : ". Section notes are pinned to their sections as they are now only from /dev/examples"}`} className={BTN}>Re-pin all to HEAD</button>
                <button type="button" disabled={!notes.length} onClick={() => (clearing ? (write(() => []), setClearing(false)) : setClearing(true))} className={`${BTN} ${clearing ? "!border-rose-400 !bg-rose-500/20 !text-rose-100" : ""}`}>{clearing ? "Click again to delete all" : "Clear all"}</button>
                <button type="button" disabled={!notes.length} onClick={copy} className={copied ? `${PRIMARY} !border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100` : PRIMARY}><Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy all notes"}</button>
              </span>
            </div>
            <Link href="/dev/notes" className="mt-2 inline-block text-xs text-sky-300 underline-offset-2 hover:underline">All pages&apos; notes →</Link>
          </div>
        )}
        <button
          type="button"
          onClick={() => (open || on ? (setOpen(false), setOn(false)) : (setOpen(true), setOn(true)))}
          title="Notes on the wording of this page (N: open or close, A: note a text)"
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/50 px-3.5 py-2 text-xs font-semibold shadow-lg ${on ? "bg-amber-400 text-slate-950" : "bg-slate-950/95 text-amber-100"}`}
        >
          <Icon name="pencil" size={12} />{on && !open ? "Click a text · A or Esc" : notes.length ? `Notes · ${here.length}/${notes.length}` : "Notes"}<kbd className="rounded border border-current px-1 font-mono text-[10px] opacity-70">N</kbd>
        </button>
      </div>
    </>
  );
}
