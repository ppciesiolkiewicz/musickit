import Link from "next/link";
import Icon from "@/components/Icon";
import type { Tone } from "@/features/theory/sections";
import { practiceTiles } from "./tiles";

/** Solid tile colours, deep enough for white text in every theme. Full class names so Tailwind sees them. */
const TILE: Record<Tone, string> = {
  emerald: "bg-emerald-700 hover:bg-emerald-600",
  sky: "bg-sky-700 hover:bg-sky-600",
  amber: "bg-amber-700 hover:bg-amber-600",
  violet: "bg-violet-700 hover:bg-violet-600",
  rose: "bg-rose-700 hover:bg-rose-600",
  teal: "bg-teal-700 hover:bg-teal-600",
  pink: "bg-pink-700 hover:bg-pink-600",
  red: "bg-red-700 hover:bg-red-600",
};

/**
 * Every tool, drill and lesson page as a wall of flat tiles (Windows Phone style): one solid colour each (the page's own
 * tone), the icon at the top and the name at the bottom left. A wide tile (a headline tool) also shows its one-line description;
 * a small tile shows it on hover or keyboard focus, and it is always in the link's text for a screen reader.
 *
 * Layout: 3 tiles across on a phone (a wide tile spans the row), 6 on a tablet, and from `lg` the groups sit two side by
 * side with 4 tiles each, so the whole page fits about one screen instead of a long column of big squares.
 */
export default function PracticeTiles() {
  return (
    <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-2">
      {practiceTiles().map((g) => (
        <section key={g.label} aria-labelledby={`tiles-${g.label}`}>
          <h2 id={`tiles-${g.label}`} className="mb-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{g.label}</h2>
          <ul className="grid grid-flow-dense grid-cols-3 gap-1.5 md:grid-cols-6 lg:grid-cols-4">
            {g.tiles.map((t) => (
              <li key={t.href} className={t.wide ? "col-span-3 md:col-span-2" : ""}>
                <Link
                  href={t.href}
                  className={`group flex h-full flex-col justify-end p-2.5 text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.97] sm:p-3 ${t.wide ? "aspect-[5/2] md:aspect-[2/1]" : "aspect-square"} ${TILE[t.tone]}`}
                >
                  <Icon name={t.icon} size={t.wide ? 28 : 24} className="mb-auto opacity-90 transition group-hover:scale-105" />
                  <span className="text-sm font-semibold leading-tight sm:text-[15px]">{t.label}</span>
                  {t.wide ? (
                    <span className="mt-0.5 line-clamp-1 text-[13px] text-white/90">{t.desc}</span>
                  ) : (
                    // shown on hover and focus where there is room; kept in the accessibility tree (not display: none)
                    <span className="sr-only lg:not-sr-only lg:mt-0 lg:line-clamp-2 lg:max-h-0 lg:overflow-hidden lg:text-xs lg:leading-snug lg:text-white/90 lg:opacity-0 lg:transition-all lg:group-hover:mt-1 lg:group-hover:max-h-10 lg:group-hover:opacity-100 lg:group-focus-visible:mt-1 lg:group-focus-visible:max-h-10 lg:group-focus-visible:opacity-100">
                      {t.desc}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
