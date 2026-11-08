import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import Icon from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import StringsOfLight from "@/components/landing/StringsOfLight";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import Photo, { type PhotoKey } from "@/components/landing/Photo";
import StyleDivider from "@/components/landing/StyleDivider";
import SiteFooter from "@/components/landing/SiteFooter";
import CourseSoon from "@/components/landing/CourseSoon";
import { DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import { LiveLessonMock } from "@/components/landing/LessonMocks";
import { Check, IdeasSection, PlanSection, SkillsSection } from "./PracticeSections";

/* The home page for players, at /players: practice, the video course and private lessons. */

/**
 * Why attunr exists, told by its founder. `photo` must be a real photo of the person telling the story: a stock photo next to a
 * name reads as them. With no photo the story shows on its own.
 */
const STORY: { name: string; detail: string; headline: string; quote: ReactNode; before: string[]; after: string[]; photo: PhotoKey | null } = {
  name: "Piotr",
  detail: "founder of attunr",
  headline: "I was stuck, so I built the practice app I needed.",
  quote: <>I practised and practised and wasn&apos;t getting better. I kept running out of ideas for what to work on, and the apps that turned practice into a game just didn&apos;t work for me. What works is drills: repeating them until my hands know them, and understanding why they work. So I built attunr. It brings me new ideas every day, with interactive exercises and diagrams I can actually practise with. <Mark tone="var(--color-amber-400)">It&apos;s not a game. It&apos;s practice.</Mark></>,
  before: ["Running out of ideas for what to practise", "Apps that felt like a game, not like music", "Practising, but not getting better"],
  after: ["New drills to practise every day", "Knowing why a drill works, so I can make up my own", "Repetition that builds muscle memory, not points"],
  photo: null,
};

/** Shown wherever the course is sold. Keep in step with the refund policy: 30 days from purchase, full refund, no reason needed. */
const GUARANTEE = "30-day money-back guarantee";

const BUNDLES = [
  { name: "The course", price: "$19.99", text: "The fretboard by ear and by colour: scales, moods, intervals, step by step.", items: ["The core video course", "Exercises in the app", GUARANTEE] },
  { name: "Course + one style", price: "$34.99", text: "The core course plus the style you came for.", items: ["The core video course", "One style course", "Exercises in the app", GUARANTEE], styleCourse: true },
  { name: "Everything", price: "$39.99", text: "The core course and every style course, as each one launches.", items: ["The core video course", "Every style course", "Exercises in the app", GUARANTEE], styleCourse: true, best: true },
];
const STYLES = ["Surf rock", "Funk", "Blues", "Jazz", "Neo-soul", "Metal", "Flamenco", "Bossa nova", "Reggae", "Country", "Indie rock"];

export default function CoachingHome() {
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/players" />
        </div>

        {/* Hero */}
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-20">
          <div className="landing-rise flex flex-col items-start">
            <a href="#plan" className="group mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 py-1 pl-1.5 pr-3 text-xs text-sky-100 transition hover:border-sky-400">
              <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[11px] font-semibold text-slate-950">New</span>
              A fresh AI practice plan, every day
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>
              Practice that
              <span className="ls-accent block italic text-sky-300">turns into playing.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Drills that build your own <Mark>guitar senses</Mark>: hands that find the note, ears that hear it, timing you feel. Understand why each one works and you&apos;ll soon be <Mark>making up your own</Mark>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/plan" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Get today&apos;s practice <Icon name="chevron-right" size={16} />
              </Link>
              <a href="#course" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="graduation-cap" size={16} /> See the course
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-400">Free to practise. No sign-up needed.</p>
          </div>
          <div className="landing-rise" style={{ animationDelay: "120ms" }}>
            <StringsOfLight />
          </div>
        </section>

        <StyleDivider />

        <SkillsSection />

        <PlanSection />

        {/* Why attunr exists, in the founder's words */}
        <section aria-labelledby="story-h" className="relative border-t border-slate-800/70 py-12 sm:py-16">
            <div className={STORY.photo ? "grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14" : "mx-auto max-w-3xl"}>
              {STORY.photo && <Photo name={STORY.photo} className="ls-photo aspect-4/5 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 35vw, 100vw" />}
              <div>
                <Eyebrow tone="text-amber-300">Why I built attunr</Eyebrow>
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

        {/* The video course: early access and bundles */}
        <section id="course" aria-labelledby="course-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <Eyebrow>The video course · early access</Eyebrow>
              <H2 id="course-h">Learn it step by step, <span className="ls-accent italic text-sky-300">and see it as you go.</span></H2>
              <p className="mt-4 max-w-xl text-slate-300">
                Want a guided path from the first note to improvising? Short video lessons take you across the fretboard by ear and by colour, and every exercise is ready to play in the app. Join early: you get the course at the <Mark>early-access price</Mark>, and <Mark>every style course free</Mark> as it launches.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-100">
                <Icon name="check" size={16} className="text-emerald-400" /> {GUARANTEE}. Not for you? Full refund, no questions asked.
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
          <p className="mt-4 text-xs text-slate-500">Every bundle comes with a {GUARANTEE}: email us within 30 days of buying for a full refund, no reason needed. Prices may change before launch. Style courses on the way: {STYLES.join(", ")}.</p>

          <div id="join" className="ls-card mt-10 grid scroll-mt-6 grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-2xl text-slate-50" style={DISPLAY}>Save your spot</p>
              <p className="mt-1 text-sm text-slate-400">One email when early access opens, with the early-adopter offer.</p>
            </div>
            <EarlyAccessForm source="course" />
          </div>
        </section>

        {/* Private lessons with professional teachers */}
        <section id="lessons" aria-labelledby="lessons-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <Eyebrow tone="text-violet-300">Private lessons</Eyebrow>
              <H2 id="lessons-h">A professional teacher, <span className="ls-accent italic text-violet-300">and progress you can feel.</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                One-to-one lessons with professional teachers, held right inside attunr. They spot what&apos;s holding you back, show you the sound instead of only telling you, and leave you with <Mark tone="var(--color-violet-400)">what to practise next</Mark>.
              </p>
              <ul className="mt-6 flex flex-col gap-4">
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

          <ul className="mt-10 grid gap-4 md:grid-cols-2">
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

        <IdeasSection />

        <section className="pb-16 text-center sm:pb-24">
          <p className="mx-auto max-w-2xl text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>
            Stop noodling. <span className="ls-accent italic text-sky-300">Start practising with a plan.</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/plan" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">Get today&apos;s practice <Icon name="chevron-right" size={16} /></Link>
            <a href="#course" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400">See the course</a>
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
