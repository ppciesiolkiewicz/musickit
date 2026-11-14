import Link from "next/link";
import AudioDevicesButton from "./AudioDevicesButton";
import AccountLink from "@/features/account/ui/AccountLink";
import { TunerButton } from "@/features/tuner";
import ThemeSwitcher from "./ThemeSwitcher";
import Icon from "./Icon";
import Wordmark from "./Wordmark";
import { SpotlightButton } from "@/features/search/Spotlight";
import { isMarketingPath } from "@/lib/publicPaths";

/** The app's three places. Each lists the paths that count as being there, for the current mark. */
const APP_LINKS = [
  { href: "/plan", label: "Plan", under: ["/plan"] },
  { href: "/teachers/studio?notes=1", label: "Notes", under: ["/teachers/studio", "/note", "/creator"] },
  { href: "/practice", label: "Practice", under: ["/practice", "/theory", "/course", "/tuner", "/looper", "/cheatsheet"] },
];

/** The two home pages, on the bar a visitor sees. */
const PUBLIC_LINKS = [
  { href: "/", label: "Music schools", under: [] as string[] },
  { href: "/players", label: "Players", under: ["/players"] },
];

const isUnder = (active: string, paths: string[]) => paths.some((p) => active === p || active.startsWith(`${p}/`));

function NavLink({ href, label, current }: { href: string; label: string; current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:px-3.5 ${current ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
    >
      {label}
    </Link>
  );
}

/** Five thin lines behind the pill's label, so it reads as a short stave. */
const STAFF = { backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 4px, rgb(125 211 252 / 0.16) 4px 5px)", backgroundSize: "100% 25px", backgroundPosition: "0 4px", backgroundRepeat: "no-repeat" };

/** The way to /demo on the visitor's bar: a pill drawn as a bit of stave with a note on it. On a phone only the note shows. */
function DemoLink({ current }: { current: boolean }) {
  return (
    <Link
      href="/demo"
      aria-label="Demos"
      aria-current={current ? "page" : undefined}
      style={STAFF}
      className={`ml-1 inline-flex items-center gap-1.5 rounded-full border border-l-[3px] px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${current ? "border-sky-300/70 bg-sky-500/25 text-sky-50" : "border-sky-400/40 border-l-sky-300/80 bg-sky-500/10 text-sky-100 hover:border-sky-300/70 hover:bg-sky-500/20"}`}
    >
      <Icon name="music" size={14} className="text-sky-300" /> <span className="hidden sm:inline">Demos</span>
    </Link>
  );
}

/**
 * The attunr top navigation, shared by every page. Its bar follows the page: a page a visitor may read
 * (`isMarketingPath`: the home pages, FAQ, demos, logging in) gets the visitor's bar, with the two home pages, Demos and
 * Log in; every other page is the app, with Plan, Notes and Practice. The tuner button sits left of the style, except on
 * the tuner page; `devices` adds the audio devices button after the style.
 */
export default function SiteNav({ active, devices = false }: { active: string; devices?: boolean }) {
  const visitor = isMarketingPath(active);
  const links = visitor ? PUBLIC_LINKS : APP_LINKS;
  return (
    <nav aria-label="attunr" className="flex flex-wrap items-center gap-1">
      <Link href={visitor ? "/" : "/plan"} aria-label={visitor ? "attunr home" : "attunr: your plan"} className="mr-5 hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:inline">
        <Wordmark className="text-[1.7rem]" />
      </Link>
      {links.map((l) => (
        <NavLink key={l.href} href={l.href} label={l.label} current={l.href === "/" ? active === "/" : isUnder(active, l.under)} />
      ))}
      {visitor && <DemoLink current={isUnder(active, ["/demo"])} />}
      <span className="ml-auto" />
      {!visitor && <SpotlightButton />}
      {!visitor && active !== "/tuner" && <TunerButton className="hidden sm:mr-1.5 sm:block" />}
      <ThemeSwitcher autoOpen={active === "/players"} />
      {devices && <AudioDevicesButton className="sm:ml-1.5" />}
      <AccountLink className="sm:ml-1.5" />
    </nav>
  );
}
