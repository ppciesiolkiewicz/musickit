"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import type { Tone } from "@/features/theory/sections";
import { openSpotlight } from "@/features/search/Spotlight";
import { filterTiles, practiceTiles } from "./tiles";

/** Tile colours under the metal finish (`.metal-tile` in decor.css), deep enough for white text. Full class names so Tailwind sees them. */
const TILE: Record<Tone, string> = {
  emerald: "bg-emerald-700",
  sky: "bg-sky-700",
  amber: "bg-amber-700",
  violet: "bg-violet-700",
  rose: "bg-rose-700",
  teal: "bg-teal-700",
  pink: "bg-pink-700",
  red: "bg-red-700",
};

const KBD = "rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 font-sans text-[0.7rem] leading-none text-slate-300";

/** True when the key press is going into a text field, where "/" is just a character. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Every tool, drill and lesson page as a wall of tiles (Windows Phone style) in brushed metal: one colour each (the page's
 * own tone), the icon at the top and the name at the bottom left. A tile lifts on hover. A wide tile (a headline tool) also
 * shows its one-line description; a small tile keeps it for screen readers only.
 *
 * Over the tiles, a filter field: typing narrows the tiles (name, description and group). On this page ⌘K / Ctrl+K and "/"
 * go to the field instead of opening the site search (Spotlight skips a key already handled); Enter opens the first tile
 * left, Escape clears the field.
 *
 * Layout: 3 tiles across on a phone (a wide tile spans the row), 6 on a tablet, and from `lg` the groups sit two side by
 * side with 4 tiles each, so the whole page fits about one screen instead of a long column of big squares.
 */
export default function PracticeTiles() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => filterTiles(practiceTiles(), query), [query]);
  const count = groups.reduce((n, g) => n + g.tiles.length, 0);

  useEffect(() => {
    // capture phase, so this runs before Spotlight's window listener and can mark ⌘K handled
    const onKey = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target);
      if (!cmdK && !slash) return;
      e.preventDefault();
      field.current?.focus();
      field.current?.select();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-2 z-10 -mx-1 px-1">
        <label className="group/field flex h-14 w-full items-center gap-3 rounded-2xl border border-slate-600/80 bg-slate-900/90 px-4 shadow-lg shadow-black/30 backdrop-blur transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/30 lg:max-w-2xl">
          <Icon name="search" size={20} className="shrink-0 text-slate-400 group-focus-within/field:text-sky-300" />
          <span className="sr-only">Find a tool or drill</span>
          <input
            ref={field}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query && count > 0) router.push(groups[0].tiles[0].href);
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Find a tool or drill"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-base text-slate-100 placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" onClick={() => { setQuery(""); field.current?.focus(); }} aria-label="Clear" className="rounded-md p-1 text-slate-400 hover:text-slate-100">
              <Icon name="x" size={18} />
            </button>
          ) : (
            <span aria-hidden className="hidden shrink-0 items-center gap-1.5 text-xs text-slate-500 desk:flex">
              <kbd className={KBD}>/</kbd> or <kbd className={KBD}>⌘K</kbd>
            </span>
          )}
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{query ? `${count} ${count === 1 ? "tile" : "tiles"}` : ""}</p>

      {count === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-slate-300">Nothing here matches “{query.trim()}”.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setQuery(""); field.current?.focus(); }} className="rounded-lg border border-slate-600 px-3.5 py-2 text-sm text-slate-200 hover:border-slate-400">
              Clear the search
            </button>
            <button type="button" onClick={openSpotlight} className="rounded-lg px-3.5 py-2 text-sm text-sky-300 hover:text-sky-200">
              Search every page
            </button>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-2">
          {groups.map((g) => (
            <section key={g.label} aria-labelledby={`tiles-${g.label}`}>
              <h2 id={`tiles-${g.label}`} className="mb-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{g.label}</h2>
              <ul className="grid grid-flow-dense grid-cols-3 gap-1.5 md:grid-cols-6 lg:grid-cols-4">
                {g.tiles.map((t) => (
                  <li key={t.href} className={t.wide ? "col-span-3 md:col-span-2" : ""}>
                    <Link
                      href={t.href}
                      className={`group flex h-full flex-col justify-end p-2.5 text-white metal-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:p-3 ${t.wide ? "aspect-[5/2] md:aspect-[2/1]" : "aspect-square"} ${TILE[t.tone]}`}
                    >
                      <Icon name={t.icon} size={t.wide ? 28 : 24} className="mb-auto opacity-95 drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]" />
                      <span className="text-sm font-semibold leading-tight sm:text-[15px]">{t.label}</span>
                      {t.wide ? (
                        <span className="mt-0.5 line-clamp-1 text-[13px] text-white/90">{t.desc}</span>
                      ) : (
                        <span className="sr-only">{t.desc}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
