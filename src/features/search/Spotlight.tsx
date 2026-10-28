"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import type { SearchEntry } from "./searchIndex";

const OPEN_EVENT = "attunr:spotlight";

/** Opens the spotlight from anywhere (the nav's search button). */
export const openSpotlight = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** The nav's search button: a magnifier, with the shortcut on wide screens. */
export function SpotlightButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openSpotlight}
      aria-label="Search pages"
      title="Search pages (⌘K)"
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-400 transition hover:text-slate-200 ${className}`}
    >
      <Icon name="search" size={16} />
      <kbd className="hidden rounded border border-slate-700 px-1.5 font-sans text-[0.65rem] text-slate-500 desk:inline">⌘K</kbd>
    </button>
  );
}

/**
 * A spotlight over every page: ⌘K / Ctrl+K (or the nav's search button) opens it, typing filters pages, course sections and
 * scales, arrows move, Enter opens, Escape closes. Lives in the root layout; the index loads on first open.
 */
export default function Spotlight() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const [index, setIndex] = useState<{ entries: SearchEntry[]; searchFor: (e: SearchEntry[], q: string) => SearchEntry[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    if (!index) import("./searchIndex").then((m) => setIndex({ entries: m.searchEntries(), searchFor: (e, q) => m.searchFor(e, q) }));
  }, [open, index]);

  const results = useMemo(() => (index ? index.searchFor(index.entries, query) : []), [index, query]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${at}"]`)?.scrollIntoView({ block: "nearest" });
  }, [at]);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setQuery("");
      setAt(0);
    });
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const go = (e: SearchEntry | undefined) => {
    if (!e) return;
    setOpen(false);
    router.push(e.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    /* keep typing away from the page's own shortcuts (the piano, the looper) */
    e.stopPropagation();
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAt((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAt((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") go(results[at]);
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/70 px-4 pt-[12vh] backdrop-blur-sm" onPointerDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search pages"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-4">
          <Icon name="search" size={18} className="text-slate-500" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAt(0);
            }}
            placeholder="Search pages, course, scales…"
            aria-label="Search"
            className="w-full bg-transparent py-3.5 text-base text-slate-100 outline-none placeholder:text-slate-500"
          />
          <kbd className="hidden rounded border border-slate-700 px-1.5 text-[0.65rem] text-slate-500 sm:inline">Esc</kbd>
        </div>
        <ul ref={list} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {index && results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">Nothing matches “{query}”</li>}
          {results.map((r, i) => (
            <li key={r.href + r.label} data-i={i} role="option" aria-selected={i === at}>
              {(i === 0 || results[i - 1].group !== r.group) && <div className="px-3 pb-1 pt-2 text-[0.65rem] uppercase tracking-wider text-slate-500">{r.group}</div>}
              <a
                href={r.href}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  go(r);
                }}
                onPointerMove={() => setAt(i)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === at ? "bg-sky-500/15" : ""}`}
              >
                <Icon name={r.icon} size={16} className={i === at ? "text-sky-300" : "text-slate-500"} />
                <span className="min-w-0">
                  <span className={`block truncate text-sm ${i === at ? "text-sky-100" : "text-slate-100"}`}>{r.label}</span>
                  <span className="block truncate text-xs text-slate-500">{r.desc}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
