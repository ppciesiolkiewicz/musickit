import Icon, { type IconName } from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";

/*
 * What is coming for running a school or studio: scheduling and profiles. The music-school home (/) and the
 * founding-partner page (/kickstarter) both show these cards, so the two pages promise the same things.
 */

/** A coming-soon card's heading, with the badge that says it isn't here yet. */
export function SoonHeading({ icon, tone, title }: { icon: IconName; tone: string; title: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon name={icon} size={20} /></span>
        <h3 className="text-2xl text-slate-50" style={DISPLAY}>{title}</h3>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
        <span className="size-1.5 rounded-full bg-sky-300" /> Coming soon
      </span>
    </div>
  );
}

/** A teacher's lessons across three days, drawn for the scheduling card. Illustration only. */
const WEEK: { day: string; lessons: { time: string; who: string; tone: string }[] }[] = [
  { day: "Mon", lessons: [{ time: "4:00", who: "Mia · guitar", tone: "border-sky-400/40 bg-sky-400/10 text-sky-200" }, { time: "5:00", who: "Noah · voice", tone: "border-violet-400/40 bg-violet-400/10 text-violet-200" }] },
  { day: "Wed", lessons: [{ time: "3:30", who: "Ava · guitar", tone: "border-sky-400/40 bg-sky-400/10 text-sky-200" }] },
  { day: "Fri", lessons: [{ time: "4:30", who: "Leo · guitar", tone: "border-sky-400/40 bg-sky-400/10 text-sky-200" }, { time: "6:00", who: "Group · voice", tone: "border-violet-400/40 bg-violet-400/10 text-violet-200" }] },
];

function ScheduleMock() {
  return (
    <div className="mt-auto grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      {WEEK.map((d) => (
        <div key={d.day} className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-slate-500">{d.day}</p>
          {d.lessons.map((l) => (
            <div key={l.time} className={`rounded-lg border px-2 py-1.5 text-xs ${l.tone}`}>
              <b className="block font-semibold">{l.time}</b>
              <span className="block truncate opacity-80">{l.who}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** One student's profile, drawn for the profiles card. Illustration only. */
function ProfileMock() {
  return (
    <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-200">M</span>
        <span className="min-w-0 text-sm">
          <b className="block font-semibold text-slate-100">Mia</b>
          <span className="text-slate-400">Guitar · Mondays 4:00</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
        <li className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5"><Icon name="file-text" size={14} className="shrink-0 text-teal-300" /> Lesson note: A minor pentatonic</li>
        <li className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5"><Icon name="sparkles" size={14} className="shrink-0 text-sky-300" /> Practice plan: week 3</li>
      </ul>
    </div>
  );
}

/** The two coming-soon cards for running a school: scheduling and profiles. Renders `<li>`s, so it sits inside the page's own list. */
export function StudioSoonCards() {
  return (
    <>
      <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <SoonHeading icon="columns-3" tone="bg-sky-500/15 text-sky-300" title="Scheduling" />
        <p className="text-sm leading-relaxed text-slate-400">One calendar for every lesson. Each teacher and each student sees their own week, and a moved lesson shows up for both.</p>
        <ScheduleMock />
      </li>
      <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
        <SoonHeading icon="graduation-cap" tone="bg-amber-500/15 text-amber-300" title="Profiles" />
        <p className="text-sm leading-relaxed text-slate-400">A profile for each teacher and each student. A student&apos;s profile keeps their lesson times, lesson notes and practice plan in one place.</p>
        <ProfileMock />
      </li>
    </>
  );
}
