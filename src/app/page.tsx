import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import StringsOfLight from "@/components/landing/StringsOfLight";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import Photo from "@/components/landing/Photo";
import StyleDivider from "@/components/landing/StyleDivider";
import SiteFooter from "@/components/landing/SiteFooter";
import CourseSoon from "@/components/landing/CourseSoon";
import { DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import { LiveLessonMock } from "@/components/landing/LessonMocks";
import ScaleWheel from "@/components/theory/ScaleWheel";
import { degreeColour, degreeLabels } from "@/features/theory/scales";
import { FAMILIES, MAJOR, modeSteps } from "@/features/theory/theory";

export const metadata: Metadata = {
  title: "attunr: your one-stop hub for music drills and theory",
  description: "A video course, private lessons with professional teachers, and tools that show every sound on the fretboard in colour, so practice finally turns into progress. Early access is open.",
};

/**
 * A student's story, told by the student. It must be a real person, with their permission: until it is filled in, `draft` keeps
 * the section to local development so placeholder words and a stock photo never go out as someone's story.
 */
const STORY = {
  draft: true,
  name: "[Name]",
  detail: "[age], [city]",
  headline: "[N] years stuck on the same chords. Improvising in [N] months.",
  quote: "[In their words: what practice felt like before, the moment it clicked, and what they play now.]",
  before: ["[Learning songs from tabs, one at a time]", "[No idea why a solo worked or didn't]", "[Practising, but not getting better]"],
  after: ["[Sees the scale under their fingers]", "[Improvises over a loop in any key]", "[Knows what to practise next]"],
};

/** Bundles at launch; early-access members get the course now and every style course free as it comes out. */
const BUNDLES = [
  { name: "The course", price: "$19.99", text: "The fretboard by ear and by colour: scales, moods, intervals, step by step.", items: ["The core video course", "Exercises in the app"] },
  { name: "Course + one style", price: "$34.99", text: "The core course plus the style you came for.", items: ["The core video course", "One style course", "Exercises in the app"], styleCourse: true },
  { name: "Everything", price: "$39.99", text: "The core course and every style course, as each one launches.", items: ["The core video course", "Every style course", "Exercises in the app"], styleCourse: true, best: true },
];
const STYLES = ["Surf rock", "Funk", "Blues", "Jazz", "Neo-soul", "Metal", "Flamenco", "Bossa nova", "Reggae", "Country", "Indie rock"];

function Check({ children, tone = "text-emerald-400" }: { children: ReactNode; tone?: string }) {
  return <li className="flex gap-2"><Icon name="check" size={16} className={`mt-0.5 shrink-0 ${tone}`} /><span>{children}</span></li>;
}

/** The practice path: where you are and what comes next, coloured like the degrees. */
function ProgressPath() {
  const stages = ["Notes", "Scales", "Moods", "Chords", "Improvise"];
  return (
    <div className="flex w-full max-w-xs flex-col gap-2" aria-hidden>
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i < 2 ? "text-slate-950" : i === 2 ? "text-slate-950 ring-4 ring-sky-400/30" : "border border-slate-700 text-slate-500"}`} style={i <= 2 ? { background: degreeColour(i * 2 % 7) } : undefined}>
            {i < 2 ? <Icon name="check" size={14} /> : i + 1}
          </span>
          <span className={`h-2 flex-1 rounded-full ${i < 2 ? "bg-emerald-500/60" : i === 2 ? "bg-linear-to-r from-sky-400/70 to-slate-800" : "bg-slate-800"}`} />
          <span className={`w-20 text-sm ${i <= 2 ? "text-slate-100" : "text-slate-500"}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

/** What practice in attunr trains: the skills behind playing well. Marketing copy only, no links. */
const SKILLS: { icon: IconName; title: string; text: string; tone: string }[] = [
  { icon: "guitar", title: "Know the fretboard", text: "Find any note in a second. Learn the neck by note name, by colour and by the job each note does in the scale, until it stops being a grid of frets and becomes a map you can read.", tone: "bg-amber-500/15 text-amber-300" },
  { icon: "repeat", title: "Build muscle memory", text: "Play the same thing again and again until your hands know it on their own. Once they move freely, you stop hunting for notes and have time to choose what to play next.", tone: "bg-teal-500/15 text-teal-300" },
  { icon: "ear", title: "Train your ear", text: "Hear an interval and know what it is. You'll pick melodies out by ear, and the lines you write will land where you meant them to.", tone: "bg-sky-500/15 text-sky-300" },
  { icon: "mic", title: "Sing what you play", text: "Your voice is the quickest way to know a note from the inside. Sing scales and melodies in tune and you'll recognise notes faster and write melodies that feel natural to follow.", tone: "bg-rose-500/15 text-rose-300" },
  { icon: "metronome", title: "Play in time", text: "Hit the beat, not just the note. See exactly how early or late you are, and lock in with a metronome or a drone.", tone: "bg-violet-500/15 text-violet-300" },
];

const DO: { href: string; verb: string; label: string; icon: IconName; tone: string }[] = [
  { href: "/theory/metronome-drone", verb: "Keep time", label: "Metronome & drone", icon: "audio-lines", tone: "bg-violet-500/15 text-violet-300" },
  { href: "/theory/scales", verb: "See", label: "Scales", icon: "sliders-horizontal", tone: "bg-amber-500/15 text-amber-300" },
  { href: "/looper", verb: "Play", label: "Looper", icon: "repeat", tone: "bg-teal-500/15 text-teal-300" },
];

export default function Home() {
  const showStory = !STORY.draft || process.env.NODE_ENV !== "production";
  const dorian = modeSteps(FAMILIES[0], 1);
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/" />
        </div>

        {/* Hero */}
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-20">
          <div className="landing-rise flex flex-col items-start">
            <a href="#course" className="group mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 py-1 pl-1.5 pr-3 text-xs text-sky-100 transition hover:border-sky-400">
              <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[11px] font-semibold text-slate-950">Open</span>
              Early access to the video course
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>
              See what
              <span className="ls-accent block italic text-sky-300">you hear.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Plenty of guitarists practise for years and still feel stuck. attunr shows you what&apos;s really happening on the fretboard, so every practice session turns into progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#course" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Get early access <Icon name="chevron-right" size={16} />
              </a>
              <a href="#lessons" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="headphones" size={16} /> Private lessons
              </a>
            </div>
            <Link href="/theory/scales" className="mt-5 text-sm text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-slate-200">or try the free tools first</Link>
          </div>
          <div className="landing-rise" style={{ animationDelay: "120ms" }}>
            <StringsOfLight />
          </div>
        </section>

        <StyleDivider />

        {/* What you'll work on: the skills practice in attunr builds */}
        <section aria-labelledby="skills-h" className="border-t border-slate-800/70 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>What you&apos;ll work on</Eyebrow>
            <H2 id="skills-h">The skills that make <span className="ls-accent italic text-sky-300">a better player.</span></H2>
          </div>
          {/* two wide cards over three narrower ones on desktop */}
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {SKILLS.map((s, i) => (
              <li key={s.title} className={`ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 ${i < 2 ? "lg:col-span-3" : "lg:col-span-2"} ${i === SKILLS.length - 1 ? "md:col-span-2 lg:col-span-2" : ""}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone}`}><Icon name={s.icon} size={20} /></span>
                <h3 className="text-2xl text-slate-50" style={DISPLAY}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{s.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* A student's story */}
        {showStory && (
          <section aria-labelledby="story-h" className="relative border-t border-slate-800/70 py-14 sm:py-20">
            {STORY.draft && (
              <p className="mb-6 w-fit rounded-full border border-amber-500/60 bg-amber-500/15 px-3 py-1 text-xs text-amber-100">
                Draft: shown only in development. Fill in STORY in src/app/page.tsx with a real student&apos;s story (and their photo, with permission) to publish it.
              </p>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
              <Photo name="practising" className="ls-photo aspect-4/5 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 35vw, 100vw" />
              <div>
                <Eyebrow tone="text-amber-300">A student&apos;s story</Eyebrow>
                <H2 id="story-h">{STORY.headline}</H2>
                <blockquote className="mt-6 border-l-2 border-amber-400/60 pl-5 text-lg italic leading-relaxed text-slate-300" style={DISPLAY}>“{STORY.quote}”</blockquote>
                <p className="mt-3 pl-5 text-sm text-slate-400"><b className="text-slate-200">{STORY.name}</b>, {STORY.detail}</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="ls-card rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                    <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">Before</p>
                    <ul className="flex flex-col gap-2 text-sm text-slate-400">{STORY.before.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />{t}</li>)}</ul>
                  </div>
                  <div className="ls-card rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                    <p className="mb-3 text-xs uppercase tracking-widest text-emerald-300">After</p>
                    <ul className="flex flex-col gap-2 text-sm text-slate-200">{STORY.after.map((t) => <Check key={t}>{t}</Check>)}</ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* The video course: early access and bundles */}
        <section id="course" aria-labelledby="course-h" className="scroll-mt-6 border-t border-slate-800/70 py-14 sm:py-20">
          <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <Eyebrow>The video course · early access</Eyebrow>
              <H2 id="course-h">Learn it step by step, <span className="ls-accent italic text-sky-300">and see it as you go.</span></H2>
              <p className="mt-5 max-w-xl text-slate-300">
                Short video lessons that take you across the fretboard by ear and by colour, with every exercise ready to play in the app. Join early: you get the course at the early-access price, and every style course free as it launches.
              </p>
            </div>
            <Photo name="couch" className="ls-photo aspect-16/10 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>

          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {BUNDLES.map((b) => (
              <li key={b.name} className={`ls-card relative flex flex-col gap-4 rounded-3xl border p-6 ${b.best ? "border-sky-400/70 bg-sky-500/10 shadow-xl shadow-sky-500/10" : "border-slate-800 bg-slate-900/50"}`}>
                {b.best && <span className="ls-badge absolute -top-3 left-6 rounded-full bg-sky-400 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-950">Best value</span>}
                <div>
                  <p className="text-xl text-slate-50" style={DISPLAY}>{b.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{b.text}</p>
                </div>
                <p className="flex items-baseline gap-2">
                  <span className="ls-metal text-4xl text-slate-50" style={DISPLAY}>{b.price}</span>
                  <span className="text-xs text-slate-500">one-off, at launch</span>
                </p>
                <ul className="flex flex-col gap-2 text-sm text-slate-300">{b.items.map((t) => <Check key={t}>{t}</Check>)}</ul>
                {b.styleCourse && <CourseSoon />}
                {b.best && <p className="rounded-xl bg-slate-950/50 px-3 py-2 text-xs text-sky-100">Early access: get the course now and every style course free as it launches.</p>}
                <a href="#join" className={`ls-btn mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${b.best ? "ls-btn-primary ls-glint bg-sky-400 text-slate-950 hover:bg-sky-300" : "border border-slate-600 text-slate-100 hover:border-slate-400"}`}>
                  Join early access
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">Prices may change before launch. Style courses on the way: {STYLES.join(", ")}.</p>

          <div id="join" className="ls-card mt-10 grid scroll-mt-6 grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-2xl text-slate-50" style={DISPLAY}>Save your spot</p>
              <p className="mt-1 text-sm text-slate-400">One email when early access opens, with the early-adopter offer.</p>
            </div>
            <EarlyAccessForm source="course" />
          </div>
        </section>

        {/* Private lessons with professional teachers */}
        <section id="lessons" aria-labelledby="lessons-h" className="scroll-mt-6 border-t border-slate-800/70 py-14 sm:py-20">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <Eyebrow tone="text-violet-300">Private lessons</Eyebrow>
              <H2 id="lessons-h">A professional teacher, <span className="ls-accent italic text-violet-300">and progress you can feel.</span></H2>
              <p className="mt-5 max-w-lg text-slate-300">
                One-to-one lessons with professional teachers, held right inside attunr. They spot what&apos;s holding you back, show you the sound instead of only telling you, and leave you with exactly what to practise.
              </p>
              <ul className="mt-7 flex flex-col gap-4">
                {[
                  { icon: "zap" as const, t: "Faster than practising alone", s: "A pro hears in minutes what you'd take months to notice.", c: "bg-sky-500/15 text-sky-300" },
                  { icon: "eye" as const, t: "See it together", s: "Any scale, neck or groove on both screens in a second; “play the yellow one” just works.", c: "bg-amber-500/15 text-amber-300" },
                  { icon: "book-open" as const, t: "Notes after every lesson", s: "The shapes, the exercises and what comes next, on a page you can come back to.", c: "bg-teal-500/15 text-teal-300" },
                  { icon: "history" as const, t: "Your progress stays with you", s: "Change teachers whenever you like; the next one picks up where you left off.", c: "bg-violet-500/15 text-violet-300" },
                ].map((x) => (
                  <li key={x.t} className="flex gap-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${x.c}`}><Icon name={x.icon} size={20} /></span>
                    <span><b className="block font-semibold text-slate-100">{x.t}</b><span className="text-sm text-slate-400">{x.s}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative pb-40 sm:pb-24">
              <Photo name="teacherTablet" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 45vw, 100vw" />
              <div className="absolute -bottom-2 left-0 w-[88%] sm:-left-6 sm:w-[70%]">
                <LiveLessonMock />
              </div>
            </div>
          </div>

          <ul className="mt-14 grid gap-4 md:grid-cols-2">
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-xl text-slate-50" style={DISPLAY}>Private lessons</p>
              <p className="text-sm text-slate-400">Book a professional teacher when you want one. Each teacher sets their own rate.</p>
              <ul className="flex flex-col gap-2 text-sm text-slate-300">
                <Check>One-to-one, inside the app</Check>
                <Check>Lesson notes after every lesson</Check>
                <Check>Switch teachers any time</Check>
              </ul>
            </li>
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-violet-400/50 bg-violet-500/10 p-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xl text-slate-50" style={DISPLAY}>VIP coaching</p>
                <p><span className="ls-metal text-3xl text-slate-50" style={DISPLAY}>$1,000</span><span className="text-xs text-slate-400"> / month</span></p>
              </div>
              <p className="text-sm text-slate-400">For players who want to move as fast as possible, with a coach who knows their playing inside out.</p>
              <ul className="flex flex-col gap-2 text-sm text-slate-300">
                <Check tone="text-violet-300">Roadmap sketching: where you are, where you want to be, and the route between</Check>
                <Check tone="text-violet-300">A personalised plan built around the music you want to play</Check>
                <Check tone="text-violet-300">Live chat support across time zones, whenever you&apos;re practising</Check>
              </ul>
            </li>
          </ul>
          <div className="ls-card mt-6 grid grid-cols-[minmax(0,1fr)] items-center gap-4 rounded-3xl border border-violet-500/30 bg-violet-500/5 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <p className="text-sm text-slate-200">Lessons open soon. Get a first slot before anyone else.</p>
            <EarlyAccessForm source="lessons" compact initial={["private-lessons"]} cta="Save me a lesson" done="You're on the list for lessons. We'll email you once when the first slots open." />
          </div>
        </section>

        {/* Seeing the sound, and practising the right thing */}
        <section aria-labelledby="ideas-h" className="border-t border-slate-800/70 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Free in the app</Eyebrow>
            <H2 id="ideas-h">Practice that <span className="ls-accent italic text-sky-300">adds up.</span></H2>
          </div>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-56 items-center justify-center">
                <ScaleWheel steps={dorian} labels={degreeLabels(dorian)} compare={MAJOR} size={210} />
              </div>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>See why it sounds that way</h3>
              <p className="text-sm leading-relaxed text-slate-400">Every scale on the ring of twelve notes. The ringed notes are the ones that give it its mood, here the warm 6th of Dorian.</p>
            </li>
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-56 items-center justify-center">
                {/* each label in its dot's own column, so it sits right under it */}
                <ul className="flex items-start gap-1.5">
                  {MAJOR.map((_, d) => {
                    const job = d === 0 ? "Home" : d === 2 ? "Mood" : d === 6 ? "Pull" : null;
                    return (
                      <li key={d} className="flex flex-col items-center gap-3">
                        <span className="flex h-11 items-center">
                          <span className={`rounded-full ${job ? "h-11 w-11" : "h-7 w-7 opacity-60"}`} style={{ background: degreeColour(d), boxShadow: d === 0 ? "0 0 0 2px var(--color-slate-50)" : undefined }} />
                        </span>
                        {job && <b className="text-xs" style={{ color: d === 0 ? "var(--color-slate-100)" : degreeColour(d) }}>{job}</b>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>Every note has a colour</h3>
              <p className="text-sm leading-relaxed text-slate-400">The home note is always white, the mood note always yellow. Learn what a note does and you&apos;ll find it in any song, in any key.</p>
            </li>
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-56 items-center justify-center"><ProgressPath /></div>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>Always know what&apos;s next</h3>
              <p className="text-sm leading-relaxed text-slate-400">Practise in an order that builds, one step at a time, so you never wonder whether today&apos;s practice was the right practice.</p>
            </li>
          </ul>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {DO.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="ls-card group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:-translate-y-0.5 hover:border-slate-600">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${d.tone}`}><Icon name={d.icon} size={20} /></span>
                  <span className="text-lg text-slate-50" style={DISPLAY}><span className="italic">{d.verb}</span> · {d.label}</span>
                  <span aria-hidden className="ml-auto text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="pb-16 text-center sm:pb-24">
          <p className="mx-auto max-w-2xl text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>
            Stop guessing. <span className="ls-accent italic text-sky-300">Start hearing it.</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#course" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">Get early access <Icon name="chevron-right" size={16} /></a>
            <a href="#lessons" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400">Private lessons</a>
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
