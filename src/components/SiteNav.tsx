import Link from "next/link";
import AudioDevicesButton from "./AudioDevicesButton";
import AccountLink from "@/features/account/ui/AccountLink";
import { TunerButton } from "@/features/tuner";
import ThemeSwitcher from "./ThemeSwitcher";
import Icon, { type IconName } from "./Icon";
import Wordmark from "./Wordmark";
import { SpotlightButton } from "@/features/search/Spotlight";
import { APP_PLACES, isUnder } from "@/lib/appPlaces";
import { isMarketingPath } from "@/lib/publicPaths";
import TeacherOnly from "@/features/students/ui/TeacherOnly";

/**
 * `icon`: on a phone the link shows only that icon (named by `label`), so a fourth link fits the row. `foldIcon`: the
 * link keeps its label, except where the labels don't fit a phone (under 380 px in a row that has the Students link,
 * under 340 px in any row), where it shows this icon instead (`nav-fold` in globals.css), so the row fits a 320 px screen.
 */
function NavLink({ href, label, current, icon, foldIcon }: { href: string; label: string; current: boolean; icon?: IconName; foldIcon?: IconName }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      aria-label={icon || foldIcon ? label : undefined}
      className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:px-3.5 ${current ? "metal-btn bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
    >
      {icon ? <><Icon name={icon} size={16} className="sm:hidden" /><span className="hidden sm:inline">{label}</span></>
        : foldIcon ? <><Icon name={foldIcon} size={16} className="nav-fold-icon" /><span className="nav-fold-label">{label}</span></>
        : label}
    </Link>
  );
}

/** The place whose label gives way to an icon when a teacher's four links meet a narrow phone: the longest label, and a page reads as notes. */
const NOTES_HREF = "/teachers/studio?notes=1";

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
 * The attunr top navigation, shared by every page. Every page shows the app's three places (Practice plan, Interactive
 * notes, Practice; on a phone the wordmark and buttons take the first row and the three links the second), so a visitor
 * sees what is inside; without a login they lead to the login page (src/proxy.ts). A page a visitor may read
 * (`isMarketingPath`: the home pages, FAQ, demos, logging in) adds Demos and has the wordmark go home (the switch
 * between the two home pages is at the top of each, and in the footer); on the app's pages the wordmark goes to the
 * plan, and search and the tuner join the bar. The tuner button sits left of the style, except on the tuner page;
 * `devices` adds the audio devices button after the style. A teacher's account (`can("students")`) gets a fourth link,
 * Students, after the three (on a phone its icon only; under 380 px Interactive notes is its icon too, so the four fit; under 340 px it is for everyone).
 */
export default function SiteNav({ active, devices = false }: { active: string; devices?: boolean }) {
  const visitor = isMarketingPath(active);
  return (
    <nav aria-label="attunr" className="flex flex-wrap items-center gap-1">
      <Link href={visitor ? "/" : "/plan"} aria-label={visitor ? "attunr home" : "attunr: your plan"} className="mr-5 inline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
        <Wordmark className="text-[1.7rem]" />
      </Link>
      {/* the app's three links share a second row on a phone, under the wordmark and the buttons; on a phone too
          narrow for the labels (under 380 px with a teacher's fourth, under 340 px without), Interactive notes shows as
          its icon (nav-fold), so the row fits at 320 px. Narrower still, the row scrolls sideways (no scrollbar) instead of wrapping a label or widening the page; the
          -my-1 py-1 pair leaves room for the focus ring inside the scroll box without moving anything */}
      <div className="nav-fold order-last -my-1 -ml-2.5 flex w-[calc(100%+0.625rem)] justify-between overflow-x-auto py-1 [scrollbar-width:none] sm:order-none sm:ml-0 sm:w-auto sm:justify-start sm:gap-1">
        {APP_PLACES.map((l) => (
          <NavLink key={l.href} href={l.href} label={l.label} current={isUnder(active, l.under)} foldIcon={l.href === NOTES_HREF ? "file-text" : undefined} />
        ))}
        {/* a teacher's fourth place, once the account is known to have students */}
        {!visitor && (
          <TeacherOnly>
            <NavLink href="/students" label="Students" icon="graduation-cap" current={isUnder(active, ["/students"])} />
          </TeacherOnly>
        )}
      </div>
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
