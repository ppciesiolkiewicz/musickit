import Link from "next/link";
import ThemeSwitcher from "./ThemeSwitcher";
export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/theory", label: "Theory articles" },
  { href: "/tuner", label: "Tuner" },
];

/** The tools, on the right of the nav; the looper last and outlined. */
export const SITE_TOOLS = [
  { href: "/cheatsheet", label: "Cheatsheet" },
  { href: "/looper", label: "Looper", outlined: true },
];

/** Sections under /theory, shown as a second nav row on theory pages. */
export const THEORY_LINKS = [
  { href: "/theory/chords", label: "Chords" },
  { href: "/theory/triads", label: "Triads" },
  { href: "/theory/scales", label: "Scales" },
  { href: "/theory/circle", label: "Circle of fifths" },
  { href: "/theory/caged", label: "CAGED" },
  { href: "/theory/arpeggios", label: "Arpeggios" },
  { href: "/theory/drone", label: "Drone" },
  { href: "/theory/improv", label: "Improv" },
  { href: "/theory/tunings", label: "Tunings" },
];

const isActive = (active: string, href: string) => (href === "/" ? active === "/" : active === href || active.startsWith(`${href}/`));

function NavLink({ href, label, current, small, outlined }: { href: string; label: string; current: boolean; small?: boolean; outlined?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-lg transition ${small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${outlined ? "border border-sky-500/60" : ""} ${current ? "bg-sky-500/20 text-sky-100" : outlined ? "text-sky-200 hover:bg-sky-500/10" : "text-slate-400 hover:text-slate-200"}`}
    >
      {label}
    </Link>
  );
}

/** The Music Kit top navigation. Shared by every page; knows nothing about any feature. */
export default function SiteNav({ active }: { active: string }) {
  const inTheory = isActive(active, "/theory");
  return (
    <div className="flex flex-col gap-1">
      <nav aria-label="Music Kit" className="flex flex-wrap items-center gap-1">
        <span className="mr-3 text-sm font-light tracking-widest text-slate-400">MUSIC KIT</span>
        {SITE_LINKS.map((l) => (
          <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
        ))}
        <span className="ml-auto" />
        {SITE_TOOLS.map((l) => (
          <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
        ))}
        <ThemeSwitcher className="ml-1" />
      </nav>
      {inTheory && (
        <nav aria-label="Theory" className="flex flex-wrap items-center gap-1 border-t border-slate-800 pt-1">
          {THEORY_LINKS.map((l) => (
            <NavLink key={l.href} {...l} current={isActive(active, l.href)} small />
          ))}
        </nav>
      )}
    </div>
  );
}
