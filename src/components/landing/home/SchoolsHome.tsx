import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import Photo from "@/components/landing/Photo";
import StyleDivider from "@/components/landing/StyleDivider";
import SiteFooter from "@/components/landing/SiteFooter";
import { DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import { LessonNoteMock, LiveLessonMock } from "@/components/landing/LessonMocks";
import { Check, IdeasSection, PlanDayCard, SkillsSection } from "./PracticeSections";

/*
 * The home page for music schools, at /: the practice core (drills that build muscle memory) plus what a school gets:
 * teaching resources, the notes creator, tools for online lessons and white-labelling. Players' page: /players.
 */

/** What a school gets, one card each, linking down to its section. */
const OFFER: { icon: IconName; title: string; text: string; href: string; tone: string }[] = [
  { icon: "layers", title: "Interactive teaching resources", text: "Any scale, chord or CAGED shape on screen in a second, and it plays.", href: "#resources", tone: "bg-amber-500/15 text-amber-300" },
  { icon: "file-text", title: "Notes creator", text: "Today's lesson on one page, sent to the student as a link.", href: "#notes", tone: "bg-teal-500/15 text-teal-300" },
  { icon: "share-2", title: "Tools for online lessons", text: "Your camera beside the diagrams, so a video lesson feels like the room.", href: "#online", tone: "bg-sky-500/15 text-sky-300" },
  { icon: "palette", title: "White-labelling", text: "Your name, logo and colours, so students see your school, not ours.", href: "#white-label", tone: "bg-violet-500/15 text-violet-300" },
];

/** The interactive resources a teacher can bring up in a lesson, and a student opens again at home. */
const RESOURCES: { icon: IconName; label: string; href: string }[] = [
  { icon: "sliders-horizontal", label: "Scales and modes", href: "/theory/scales" },
  { icon: "music", label: "Chords in any key", href: "/theory/chords" },
  { icon: "guitar", label: "CAGED shapes", href: "/theory/caged" },
  { icon: "grid-3x3", label: "Fretboard notes", href: "/theory/notes" },
  { icon: "circle-dot", label: "Circle of fifths", href: "/theory/circle" },
  { icon: "ear", label: "Ear training", href: "/theory/ears" },
  { icon: "metronome", label: "Rhythm drills", href: "/theory/rhythm" },
  { icon: "audio-lines", label: "Metronome & drone", href: "/theory/metronome-drone" },
  { icon: "repeat", label: "Looper", href: "/looper" },
  { icon: "gauge", label: "Tuner", href: "/tuner" },
];

const WHITE_LABEL = [
  "Your school's name and logo in place of ours",
  "Your colours across every page",
  "On your own web address",
  "Your students, your teachers, your brand",
];

export default function SchoolsHome() {
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/" />
        </div>

        {/* Hero */}
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:py-20">
          <div className="landing-rise flex flex-col items-start">
            <Eyebrow big>For music schools</Eyebrow>
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>
              Students who practise
              <span className="ls-accent block italic text-sky-300">keep coming back.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Most students drop out when they stop hearing progress, and progress happens between lessons. attunr gives each student <Mark>a short practice plan for every day</Mark>, and gives your teachers playable resources, lesson notes and tools for teaching online. All of it can carry <Mark tone="var(--color-violet-400)">your school&apos;s name</Mark>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Talk to us <Icon name="chevron-right" size={16} />
              </a>
              <Link href="/teachers/studio" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="layers" size={16} /> Try the teaching tools
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-400">Free to try today. No sign-up, nothing to install.</p>
          </div>
          <div className="landing-rise relative pb-40 sm:pb-24" style={{ animationDelay: "120ms" }}>
            <Photo name="teacherTablet" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 50vw, 100vw" priority />
            <div className="absolute -bottom-2 left-0 w-[88%] sm:-left-6 sm:w-[70%]">
              <LiveLessonMock />
            </div>
          </div>
        </section>

        {/* The offer at a glance */}
        <section aria-label="What your school gets" className="pb-12 sm:pb-16">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OFFER.map((o) => (
              <li key={o.title}>
                <a href={o.href} className="ls-card group flex h-full flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 transition hover:-translate-y-0.5 hover:border-slate-600">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${o.tone}`}><Icon name={o.icon} size={20} /></span>
                  <span className="text-xl text-slate-50" style={DISPLAY}>{o.title}</span>
                  <span className="text-sm text-slate-400">{o.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <StyleDivider />

        {/* The practice core: drills that build muscle memory */}
        <SkillsSection
          eyebrow="Between lessons"
          title={<>Lessons that start <span className="ls-accent italic text-sky-300">where the last one ended.</span></>}
          intro={<>Drills for hands, ears, voice and timing that students repeat until <Mark>it&apos;s in their muscle memory</Mark>. Each drill says why it works, so students can make up their own. Your teachers spend the lesson moving on, not going over last week again.</>}
        />

        {/* Practice every day, from the AI plan */}
        <section id="practice" aria-labelledby="practice-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <Eyebrow>A plan for every day</Eyebrow>
              <H2 id="practice-h">No more <span className="ls-accent italic text-sky-300">&ldquo;I didn&apos;t know what to practise.&rdquo;</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                Each student gets a practice plan for their level and the time they have: <Mark>new exercises every day</Mark>, each week building on the last. Short sessions with a timer, so ten minutes a day turns into a habit.
              </p>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
                <Check>Drills for the fretboard, scales, ear and rhythm</Check>
                <Check>Every exercise opens with the diagram or backing it needs</Check>
                <Check>A daily reminder at the time the student picks</Check>
              </ul>
            </div>
            <PlanDayCard />
          </div>
        </section>

        {/* Interactive teaching resources */}
        <section id="resources" aria-labelledby="resources-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow tone="text-amber-300">Interactive teaching resources</Eyebrow>
            <H2 id="resources-h">Show the sound, <span className="ls-accent italic text-amber-300">not just the shape.</span></H2>
            <p className="mt-4 text-pretty text-slate-300">Bring up any scale, chord, position or drone in a second, with no prep and no printouts. Every note plays as you tap it. Students open <Mark tone="var(--color-amber-400)">the same page at home</Mark>, so practice looks just like the lesson.</p>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RESOURCES.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="ls-card group flex h-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:-translate-y-0.5 hover:border-slate-600">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-300"><Icon name={r.icon} size={18} /></span>
                  <span className="text-sm text-slate-100">{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* One colour language for teachers and students */}
        <IdeasSection eyebrow="One method across your teachers" title={<>Switch teachers, <span className="ls-accent italic text-sky-300">keep the same colours.</span></>} />

        {/* Notes creator */}
        <section id="notes" aria-labelledby="notes-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="order-2 lg:order-1">
              <LessonNoteMock />
            </div>
            <div className="order-1 lg:order-2">
              <Eyebrow tone="text-teal-300">Notes creator</Eyebrow>
              <H2 id="notes-h">Lesson notes <span className="ls-accent italic text-teal-300">before the student leaves.</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                Lay out today&apos;s chords, scales and positions on one page in the last two minutes of the lesson, then <Mark tone="var(--color-teal-400)">send it to the student as a link</Mark>. No more lost handouts: they open it on any device, and every diagram plays.
              </p>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
                <Check tone="text-teal-300">Fretboards, chord boxes, CAGED shapes, the circle of fifths</Check>
                <Check tone="text-teal-300">Change the key and the whole page follows</Check>
                <Check tone="text-teal-300">One link, nothing to install</Check>
              </ul>
              <Link href="/teachers/studio?notes=1" className="ls-btn mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="file-text" size={16} /> Open the notes creator
              </Link>
            </div>
          </div>
        </section>

        {/* Tools for online lessons */}
        <section id="online" aria-labelledby="online-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <Eyebrow>Online teaching</Eyebrow>
              <H2 id="online-h">Teach online <span className="ls-accent italic text-sky-300">like you&apos;re in the room.</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                No more &ldquo;which fret was that?&rdquo; over a blurry webcam. The studio puts your camera next to any neck, chord, scale, metronome or drone. Share it in Zoom, Meet or Teams, and <Mark>the student sees exactly what you mean</Mark>.
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {[
                  { icon: "layers" as const, t: "Any diagram, in a second", s: "Press / and type “A dorian” or “E shape”: it's on screen, in your key.", c: "bg-sky-500/15 text-sky-300" },
                  { icon: "mic" as const, t: "The note you play lights up", s: "Plug in your guitar and every fretboard on screen shows the note you're playing.", c: "bg-rose-500/15 text-rose-300" },
                  { icon: "share-2" as const, t: "Camera and screen share", s: "Your camera, a song or a score, side by side with the diagrams.", c: "bg-teal-500/15 text-teal-300" },
                ].map((x) => (
                  <li key={x.t} className="flex gap-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${x.c}`}><Icon name={x.icon} size={20} /></span>
                    <span><b className="block font-semibold text-slate-100">{x.t}</b><span className="text-sm text-slate-400">{x.s}</span></span>
                  </li>
                ))}
              </ul>
              <Link href="/teachers/studio" className="ls-btn mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="layers" size={16} /> Open the studio
              </Link>
              <p className="mt-3 text-xs text-slate-500">The studio runs in desktop Chrome or Edge.</p>
            </div>
            <Photo name="teacherSmile" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 45vw, 100vw" />
          </div>
        </section>

        {/* White-labelling */}
        <section id="white-label" aria-labelledby="white-label-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="ls-card grid grid-cols-[minmax(0,1fr)] items-center gap-8 rounded-4xl border border-violet-500/30 bg-violet-500/5 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <Eyebrow tone="text-violet-300">White-labelling</Eyebrow>
              <H2 id="white-label-h">Your school&apos;s app, <span className="ls-accent italic text-violet-300">not ours.</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                Put your brand on every tool, drill and lesson note, and we&apos;ll set it up with you. When a student practises at home, they open <Mark tone="var(--color-violet-400)">your school</Mark>, not another app that could take them elsewhere.
              </p>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-slate-200">
              {WHITE_LABEL.map((t) => <Check key={t} tone="text-violet-300">{t}</Check>)}
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
          <div className="ls-card grid grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p id="contact-h" className="text-3xl text-slate-50" style={DISPLAY}>Bring attunr to your school</p>
              <p className="mt-2 text-sm text-slate-400">Leave your email and we&apos;ll get in touch to set it up with you for your teachers and students, under your brand if you want it. Your teachers can try the tools today, for free.</p>
            </div>
            <EarlyAccessForm source="schools" compact initial={["school"]} cta="Get in touch" done="Thanks! We'll email you to talk about your school." note="We only use it to reply. No newsletter." />
          </div>
        </section>

        <section className="pb-16 text-center sm:pb-24">
          <p className="mx-auto max-w-2xl text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>
            Students who hear progress <span className="ls-accent italic text-sky-300">stay to make more.</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#contact" className="ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">Talk to us <Icon name="chevron-right" size={16} /></a>
            <Link href="/teachers/studio" className="ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400">Try the teaching tools</Link>
          </div>
        </section>

        <SiteFooter variant="schools" />
      </div>
    </div>
  );
}
