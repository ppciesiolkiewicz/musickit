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
 * tone), the icon bottom left and the name under it. A wide tile (a headline tool) also shows its one-line description.
 */
export default function PracticeTiles() {
  return (
    <div className="flex flex-col gap-8">
      {practiceTiles().map((g) => (
        <section key={g.label} aria-labelledby={`tiles-${g.label}`}>
          <h2 id={`tiles-${g.label}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{g.label}</h2>
          <ul className="grid grid-flow-dense grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {g.tiles.map((t) => (
              <li key={t.href} className={t.wide ? "col-span-2" : ""}>
                <Link
                  href={t.href}
                  className={`group flex h-full flex-col justify-end p-3 text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.97] ${t.wide ? "aspect-[2/1]" : "aspect-square"} ${TILE[t.tone]}`}
                >
                  <Icon name={t.icon} size={t.wide ? 30 : 26} className="mb-auto opacity-90 transition group-hover:scale-105" />
                  <span className="text-[15px] font-semibold leading-tight">{t.label}</span>
                  {t.wide && <span className="mt-0.5 line-clamp-1 text-xs text-white/80">{t.desc}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
