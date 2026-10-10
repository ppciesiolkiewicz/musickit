import Link from "next/link";
export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/creator", label: "Creator" },
  { href: "/looper", label: "Looper" },
  { href: "/theory", label: "Theory" },
  { href: "/tuner", label: "Tuner" },
];

/** Sections under /theory, shown as a second nav row on theory pages. */
export const THEORY_LINKS = [
  { href: "/theory/chords", label: "Chords" },
  { href: "/theory/triads", label: "Triads" },
  { href: "/theory/scales", label: "Scales" },
  { href: "/theory/caged", label: "CAGED" },
  { href: "/theory/arpeggios", label: "Arpeggios" },
  { href: "/theory/improv", label: "Improv" },
];

const isActive = (active: string, href: string) => (href === "/" ? active === "/" : active === href || active.startsWith(`${href}/`));

function NavLink({ href, label, current, small }: { href: string; label: string; current: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-lg transition ${small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${current ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
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
