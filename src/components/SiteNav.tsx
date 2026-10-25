import Link from "next/link";
import AudioDevicesButton from "./AudioDevicesButton";
import ThemeSwitcher from "./ThemeSwitcher";
import TheoryMenu from "./TheoryMenu";
import Wordmark from "./Wordmark";
export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tuner", label: "Tuner" },
];

const isActive = (active: string, href: string) => (href === "/" ? active === "/" : active === href || active.startsWith(`${href}/`));

function NavLink({ href, label, current, small }: { href: string; label: string; current: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${small ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"} ${current ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
    >
      {label}
    </Link>
  );
}

/** The Music Kit top navigation. Shared by every page; knows nothing about any feature. `devices` adds the audio devices button after the style. */
export default function SiteNav({ active, devices = false }: { active: string; devices?: boolean }) {
  const [home, ...rest] = SITE_LINKS;
  return (
    <nav aria-label="Music Kit" className="flex flex-wrap items-center gap-1">
      <Link href="/" aria-label="Music Kit home" className="mr-5 hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:inline">
        <Wordmark className="text-[1.7rem]" />
      </Link>
      <NavLink {...home} current={isActive(active, home.href)} />
      <TheoryMenu active={active} />
      {rest.map((l) => (
        <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
      ))}
      <ThemeSwitcher className="ml-auto" compact={devices} />
      {devices && <AudioDevicesButton className="ml-1 sm:ml-1.5" />}
    </nav>
  );
}
