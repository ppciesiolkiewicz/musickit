import Link from "next/link";
import ThemeSwitcher from "./ThemeSwitcher";
import TheoryMenu from "./TheoryMenu";
import { sectionFor } from "@/features/theory/sections";
export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tuner", label: "Tuner" },
];

/** The tools, on the right of the nav; the looper last and outlined. */
export const SITE_TOOLS = [
  { href: "/cheatsheet", label: "Cheatsheet" },
  { href: "/looper", label: "Looper", outlined: true },
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
  const section = active.startsWith("/theory/") ? sectionFor(active) : undefined;
  const [home, ...rest] = SITE_LINKS;
  return (
    <div className="flex flex-col gap-1">
      <nav aria-label="Music Kit" className="flex flex-wrap items-center gap-1">
        <span className="mr-3 text-sm font-light tracking-widest text-slate-400">MUSIC KIT</span>
        <NavLink {...home} current={isActive(active, home.href)} />
        <TheoryMenu active={active} />
        {rest.map((l) => (
          <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
        ))}
        <span className="ml-auto" />
        {SITE_TOOLS.map((l) => (
          <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
        ))}
        <ThemeSwitcher className="ml-1" />
      </nav>
      {section && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-3 text-xs text-slate-500">
          <Link href="/theory" className="hover:text-slate-300">Theory</Link>
          <span aria-hidden>›</span>
          <span className="text-slate-300">{section.label}</span>
        </nav>
      )}
    </div>
  );
}
