"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { SectionAsideContext, type SectionAside } from "@/features/plan/ui/SectionAside";
import type { Section } from "@/features/plan/model/tools";
import { COMMENTS_KEY, commentsMarkdown, hashesOf, quoteOf, readComments, repinComments, sectionHash, sectionText, stateOf, type CommentState, type SectionComment } from "../model/comments";

/* ---- the store: localStorage, shared by every card and the bar through one subscription ---- */

const EVENT = "musickit.dev.comments";
let cache: { raw: string | null; list: SectionComment[] } = { raw: null, list: [] };
const EMPTY: SectionComment[] = [];

function snapshot(): SectionComment[] {
  const raw = localStorage.getItem(COMMENTS_KEY);
  if (raw !== cache.raw) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw ?? "null");
    } catch {
      /* broken: no comments */
    }
    cache = { raw, list: readComments(parsed) };
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
const write = (change: (l: SectionComment[]) => SectionComment[]) => {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(change(snapshot())));
  window.dispatchEvent(new Event(EVENT));
};

/** Every saved comment; empty on the server. */
export const useComments = (): SectionComment[] => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

/* ---- git: HEAD and each example file's last commit, from /api/dev/commit ---- */

export interface Commits {
  head: string;
  files: Record<string, { path: string; commit: string; dirty: boolean }>;
}

/** HEAD and the example files' commits, fetched once; null until they arrive (or when git isn't there). */
export function useCommits(): Commits | null {
  const [c, setC] = useState<Commits | null>(null);
  useEffect(() => {
    fetch("/api/dev/commit").then((r) => (r.ok ? r.json() : null)).then(setC, () => setC(null));
  }, []);
  return c;
}

const CommitsContext = createContext<Commits | null>(null);
export const CommitsProvider = CommitsContext.Provider;

/* ---- one example's sections, each with its comments ---- */

const TONE: Record<CommentState, string> = {
  current: "border-amber-400/40 bg-amber-300/10 text-amber-50",
  changed: "border-orange-500/60 bg-orange-500/10 text-orange-100",
  gone: "border-rose-500/60 bg-rose-500/10 text-rose-100",
};

/** Comments under one section, and the button (shown on hover, or always once there are some) that adds one. */
function CommentSlot({ example, address, index, section }: { example: string; address: string; index: number; section: Section }) {
  const all = useComments();
  const commits = useContext(CommitsContext);
  const [draft, setDraft] = useState<string | null>(null);
  const mine = all.filter((c) => c.example === example && c.address === address && c.index === index);
  const hash = sectionHash(section);
  const file = commits?.files[example];

  const add = () => {
    const text = draft?.trim();
    if (!text) return setDraft(null);
    const c: SectionComment = {
      id: crypto.randomUUID(), example, address, index, kind: section.type, quote: quoteOf(sectionText(section)), hash,
      commit: file?.commit ?? "unknown", ...(file?.dirty ? { dirty: true } : {}), text, at: new Date().toISOString(),
    };
    write((l) => [...l, c]);
    setDraft(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDraft((d) => d ?? "")}
        title="Comment on this section"
        aria-label="Comment on this section"
        className="absolute right-0 top-0 z-10 grid size-6 cursor-pointer place-items-center rounded-md border border-amber-400/50 bg-slate-950/95 text-amber-200 opacity-30 shadow transition group-hover/sec:opacity-100 focus-visible:opacity-100 hover:bg-amber-500/25"
      >
        <Icon name="pencil" size={12} />
      </button>
      {(mine.length > 0 || draft !== null) && (
        <div className="mt-2 flex min-w-72 flex-col gap-1.5">
          {mine.map((c) => {
            const state = stateOf(c, hash);
            return (
              <div key={c.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${TONE[state]}`}>
                <p className="min-w-0 flex-1 whitespace-pre-wrap">{c.text}</p>
                <span className="shrink-0 font-mono text-[10px] opacity-70" title={`Commented ${new Date(c.at).toLocaleString()} at ${c.commit}${c.dirty ? " (file had uncommitted edits)" : ""}`}>
                  {state === "changed" ? "section changed · " : ""}@{c.commit}{c.dirty ? "+" : ""}
                </span>
                {state === "changed" && (
                  <button type="button" title="The section is still right for this comment: pin it to the section as it is now" onClick={() => write((l) => l.map((x) => (x.id === c.id ? { ...x, hash, quote: quoteOf(sectionText(section)), commit: file?.commit ?? x.commit } : x)))} className="shrink-0 cursor-pointer text-[10px] underline opacity-80 hover:opacity-100">
                    keep
                  </button>
                )}
                <button type="button" aria-label="Delete comment" title="Delete" onClick={() => write((l) => l.filter((x) => x.id !== c.id))} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
                  <Icon name="x" size={12} />
                </button>
              </div>
            );
          })}
          {draft !== null && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/60 p-2">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
                  if (e.key === "Escape") setDraft(null);
                }}
                rows={2}
                placeholder="What's wrong or good here? (⌘↵ to save, Esc to cancel)"
                className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <div className="flex gap-1.5">
                <button type="button" onClick={add} className="cursor-pointer rounded-md border border-amber-400/70 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-50 hover:bg-amber-500/30">Save</button>
                <button type="button" onClick={() => setDraft(null)} className="cursor-pointer rounded-md border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Makes every section rendered inside commentable, the comments belonging to `example`. */
export function CommentsFor({ example, children }: { example: string; children: ReactNode }) {
  // called as a function by Sections (not mounted as a component): the slot it returns is the component
  const aside = useMemo<SectionAside>(() => (at) => <CommentSlot example={example} {...at} />, [example]); // eslint-disable-line react/display-name -- a render function, not a component
  return <SectionAsideContext.Provider value={aside}>{children}</SectionAsideContext.Provider>;
}

/** The bar at the bottom: how many comments (and how many outdated), HEAD, re-pin them all to it, copy them all as Markdown, clear them. */
export function CommentsBar({ sections }: { sections: Record<string, Section> }) {
  const all = useComments();
  const hashes = useMemo(() => hashesOf(sections), [sections]);
  const commits = useContext(CommitsContext);
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  if (!all.length) return null;
  const outdated = all.filter((c) => stateOf(c, hashes[`${c.example}|${c.address}|${c.index}`]) !== "current").length;
  const copy = () =>
    void navigator.clipboard.writeText(commentsMarkdown(all, { head: commits?.head, files: commits?.files, hashes })).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-slate-950/95 px-4 py-2.5 shadow-2xl shadow-black/50 backdrop-blur">
      <Icon name="pencil" size={14} className="text-amber-300" />
      <span className="text-sm text-slate-100">{all.length} comment{all.length > 1 ? "s" : ""}</span>
      {outdated > 0 && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">{outdated} on changed sections</span>}
      {commits && <span className="font-mono text-xs text-slate-500" title="The checkout's HEAD; each comment keeps its example file's commit">HEAD {commits.head}</span>}
      <span className="ml-auto flex gap-2">
        <button type="button" disabled={!commits} onClick={() => write((l) => repinComments(l, sections, commits?.files))} title="Pin every comment to its section as it is now and to HEAD, as keep does for one; comments on sections that are gone stay as they are" className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-50">
          Re-pin all to HEAD
        </button>
        <button type="button" onClick={() => (clearing ? (write(() => []), setClearing(false)) : setClearing(true))} onMouseLeave={() => setClearing(false)} className={`cursor-pointer rounded-lg border px-3 py-1 text-xs font-medium ${clearing ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>
          {clearing ? "Click again to delete all" : "Clear all"}
        </button>
        <button type="button" onClick={copy} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${copied ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-amber-400/70 bg-amber-500/20 text-amber-50 hover:bg-amber-500/30"}`}>
          <Icon name={copied ? "check" : "copy"} size={12} />{copied ? "Copied" : "Copy all comments"}
        </button>
      </span>
    </div>
  );
}

/** How many comments an example has, for its closed card. */
export function CommentCount({ example }: { example: string }) {
  const n = useComments().filter((c) => c.example === example).length;
  return n ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-200"><Icon name="pencil" size={10} />{n}</span> : null;
}
