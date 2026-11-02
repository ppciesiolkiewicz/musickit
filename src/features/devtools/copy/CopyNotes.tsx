"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { COPY_NOTES_KEY, copyNotesMarkdown, readCopyNotes, squeeze, type CopyNote } from "../model/copyNotes";

const EVENT = "musickit.dev.copyNotes";
let cache: { raw: string | null; list: CopyNote[] } = { raw: null, list: [] };
const EMPTY: CopyNote[] = [];

function snapshot(): CopyNote[] {
  const raw = localStorage.getItem(COPY_NOTES_KEY);
  if (raw !== cache.raw) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw ?? "null");
    } catch {
      /* broken: no notes */
    }
    cache = { raw, list: readCopyNotes(parsed) };
  }
  return cache.list;
}
const subscribe = (on: () => void) => {
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
};
const write = (change: (l: CopyNote[]) => CopyNote[]) => {
  localStorage.setItem(COPY_NOTES_KEY, JSON.stringify(change(snapshot())));
  window.dispatchEvent(new Event(EVENT));
};

const ROOT = "data-copy-notes";
const whereOf = (el: Element) => {
  const label = el.getAttribute("aria-label");
  return `${el.tagName.toLowerCase()}${label ? ` "${label}"` : el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/)[0]}` : ""}`;
};

/**
 * Dev only. A button at the bottom left turns on note mode: hover outlines the text under the pointer, a click (which
 * does nothing else then) opens a box for a note on that wording. Notes are kept by page; copy them all as Markdown.
 */
export default function CopyNotes() {
  const path = usePathname();
  const notes = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ text: string; where: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const hot = useRef<HTMLElement | null>(null);

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

  if (process.env.NODE_ENV === "production") return null;

  const save = () => {
    const note = draft.trim();
    if (target && note) write((l) => [...l, { id: crypto.randomUUID(), route: path, ...target, note, at: new Date().toISOString() }]);
    setTarget(null);
  };
  const copy = () =>
    void navigator.clipboard.writeText(copyNotesMarkdown(notes)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  const here = notes.filter((n) => n.route === path);

  return (
    <div {...{ [ROOT]: "" }} className="fixed bottom-3 left-3 z-[2000] flex max-w-sm flex-col items-start gap-2 text-sm">
      {target && (
        <div className="flex w-80 flex-col gap-1.5 rounded-xl border border-amber-400/60 bg-slate-950 p-2.5 text-slate-100 shadow-2xl">
          <p className="text-xs text-slate-400">“{target.text}”</p>
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()}
            placeholder="What's wrong with this wording? (⌘↵ saves, Esc leaves)"
            className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 placeholder:text-slate-500"
          />
          <div className="flex gap-1.5">
            <button type="button" onClick={save} className="cursor-pointer rounded-md border border-amber-400/70 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-50">Save</button>
            <button type="button" onClick={() => setTarget(null)} className="cursor-pointer rounded-md border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300">Cancel</button>
          </div>
        </div>
      )}
      {open && notes.length > 0 && (
        <div className="max-h-72 w-80 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 shadow-2xl">
          {(here.length ? here : notes).map((n) => (
            <div key={n.id} className="flex items-start gap-2 border-b border-slate-800 py-1.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-400">{n.route} · “{n.text}”</p>
                <p className="whitespace-pre-wrap">{n.note}</p>
              </div>
              <button type="button" aria-label="Delete note" onClick={() => write((l) => l.filter((x) => x.id !== n.id))} className="cursor-pointer opacity-60 hover:opacity-100"><Icon name="x" size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-slate-950/95 p-1 shadow-lg">
        <button type="button" onClick={() => setOn((v) => !v)} title="Note the wording of any text on this page" className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-amber-400 text-slate-950" : "text-amber-100"}`}>
          <Icon name="pencil" size={12} />{on ? "Click a text · Esc" : "Copy notes"}
        </button>
        {notes.length > 0 && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} className="cursor-pointer rounded-full px-2 py-1 text-xs text-slate-300 hover:bg-slate-800">{notes.length}</button>
            <button type="button" onClick={copy} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"><Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy"}</button>
          </>
        )}
      </div>
    </div>
  );
}
