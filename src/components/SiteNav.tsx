import Link from "next/link";
import AudioDevicesButton from "./AudioDevicesButton";
import AccountLink from "@/features/account/ui/AccountLink";
import { TunerButton } from "@/features/tuner";
import ThemeSwitcher from "./ThemeSwitcher";
import TheoryMenu from "./TheoryMenu";
import Icon from "./Icon";
import Wordmark from "./Wordmark";
import { SpotlightButton } from "@/features/search/Spotlight";
import { GROUP_LABEL, type SectionGroup } from "@/features/theory/sections";

export const SITE_LINKS = [{ href: "/", label: "Home" }];

/** The top-nav menus, in order: one per section group. On a phone they fold into one Menu so the bar never wraps. */
const MENUS: SectionGroup[] = ["learn", "guitar", "singing", "tools"];

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

/** Five thin lines behind the pill's label, so it reads as a short stave. */
const STAFF = { backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 4px, rgb(125 211 252 / 0.16) 4px 5px)", backgroundSize: "100% 25px", backgroundPosition: "0 4px", backgroundRepeat: "no-repeat" };

/** The way to /demo, right of the menus: a pill drawn as a bit of stave with a note on it, so it stands out from the plain menus. On a
 * phone only the note shows, so the bar doesn't wrap. */
function DemoLink({ current }: { current: boolean }) {
  return (
    <Link
      href="/demo"
      aria-label="Demos"
      aria-current={current ? "page" : undefined}
      style={STAFF}
      className={`ml-1 inline-flex items-center gap-1.5 rounded-full border border-l-[3px] px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${current ? "border-sky-300/70 bg-sky-500/25 text-sky-50" : "border-sky-400/40 border-l-sky-300/80 bg-sky-500/10 text-sky-100 hover:border-sky-300/70 hover:bg-sky-500/20"}`}
    >
      <Icon name="music" size={14} className="text-sky-300 transition group-hover:-translate-y-0.5" /> <span className="hidden sm:inline">Demos</span>
    </Link>
  );
}

/** The attunr top navigation. Shared by every page. The tuner button (a pop-up tuner) sits left of the style, except on the tuner page;
 * `devices` adds the audio devices button after the style. */
export default function SiteNav({ active, devices = false }: { active: string; devices?: boolean }) {
  const [home, ...rest] = SITE_LINKS;
  return (
    <nav aria-label="attunr" className="flex flex-wrap items-center gap-1">
      <Link href="/" aria-label="attunr home" className="mr-5 hidden rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:inline">
        <Wordmark className="text-[1.7rem]" />
      </Link>
      <NavLink {...home} current={isActive(active, home.href)} />
      {MENUS.map((g) => (
        <TheoryMenu key={g} active={active} label={GROUP_LABEL[g]} groups={[g]} className="hidden desk:block" />
      ))}
      <TheoryMenu active={active} label="Menu" groups={MENUS} className="desk:hidden" />
      <DemoLink current={isActive(active, "/demo")} />
      {rest.map((l) => (
        <NavLink key={l.href} {...l} current={isActive(active, l.href)} />
      ))}
      <SpotlightButton className="ml-auto" />
      {active !== "/tuner" && <TunerButton className="sm:mr-1.5" />}
      <ThemeSwitcher autoOpen={active === "/players"} />
      {devices && <AudioDevicesButton className="sm:ml-1.5" />}
      <AccountLink className="sm:ml-1.5" />
    </nav>
  );
}
