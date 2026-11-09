import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import ContactForm from "@/components/landing/ContactForm";
import Photo from "@/components/landing/Photo";
import StyleDivider from "@/components/landing/StyleDivider";
import Glow from "@/components/landing/Glow";
import SiteFooter from "@/components/landing/SiteFooter";
import { BetaBadge, DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import { AfterClassMock, LessonNoteMock, LiveLessonMock } from "@/components/landing/LessonMocks";
import { degreeColour } from "@/features/theory/scales";
import { Check, IdeasSection, PLAY_TOOLS, PlanDayCard, SkillsSection } from "./PracticeSections";

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

/**
 * What a teacher brings up to show something in a lesson, and a student opens again at home. Only the showing tools: the drills
 * sit on the skill cards and the play-along tools under the colour ideas, so none shows twice on this page.
 */
const RESOURCES: { icon: IconName; label: string; href: string }[] = [
  { icon: "sliders-horizontal", label: "Scales and modes", href: "/theory/scales" },
  { icon: "music", label: "Chords in any key", href: "/theory/chords" },
  { icon: "guitar", label: "CAGED shapes", href: "/theory/caged" },
  { icon: "triangle", label: "Triads", href: "/theory/triads" },
  { icon: "circle-dot", label: "Circle of fifths", href: "/theory/circle" },
  { icon: "piano", label: "Piano and staff", href: "/theory/piano" },
];

const WHITE_LABEL = [
  "Your school's name and logo in place of ours",
  "Your colours across every page",
  "On your own web address",
  "Your students, your teachers, your brand",
];

/** A coming-soon card's heading, with the badge that says it isn't here yet. */
function SoonHeading({ icon, tone, title }: { icon: IconName; tone: string; title: string }) {
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

/** Minutes practised each day, drawn for the progress tracker card. Illustration only. */
const PRACTICE_WEEK = [{ d: "M", mins: 10 }, { d: "T", mins: 20 }, { d: "W", mins: 15 }, { d: "T", mins: 0 }, { d: "F", mins: 25 }, { d: "S", mins: 10 }, { d: "S", mins: 20 }];

function PracticeWeekMock() {
  return (
    <div className="mt-auto flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-slate-200">This week</p>
        <p className="text-xs text-slate-500">100 min · 6 days</p>
      </div>
      <ul className="mt-3 flex min-h-24 flex-1 items-end gap-2">
        {PRACTICE_WEEK.map((x, i) => (
          <li key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className={`w-full rounded-md ${x.mins ? "bg-linear-to-t from-teal-500/60 to-teal-300" : "bg-slate-800"}`} style={{ height: x.mins ? `${(x.mins / 25) * 100}%` : "4px" }} />
            <span className="text-xs text-slate-500">{x.d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A nudge as the student would get it, drawn for the accountability card. Illustration only. */
function ReminderMock() {
  return (
    <div className="mt-auto flex min-h-40 flex-1 items-center rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      <div className="flex w-full gap-3 rounded-2xl border border-slate-700/60 bg-slate-900 p-3 shadow-lg shadow-slate-950/40">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon name="bell" size={18} /></span>
        <span className="min-w-0 text-sm">
          <b className="block font-semibold text-slate-100">Three days since your last practice</b>
          <span className="text-slate-400">Today&apos;s plan is ten minutes. Got time now?</span>
        </span>
      </div>
    </div>
  );
}

/**
 * The E-shape box of A minor, high string first, as [fret, degree index], from `theory box A minor E`. Degrees 2 and 6
 * (index 1 and 5) are the notes the pentatonic leaves out.
 */
const A_MINOR_BOX: [number, number][][] = [
  [[5, 0], [7, 1], [8, 2]],
  [[5, 4], [6, 5], [8, 6]],
  [[4, 1], [5, 2], [7, 3]],
  [[5, 6], [7, 0]],
  [[5, 3], [7, 4], [8, 5]],
  [[5, 0], [7, 1], [8, 2]],
];
const BOX_DEGREES = ["R", "2", "3", "4", "5", "6", "7"];

/** One neck for the adaptive view card: the pentatonic with only the home note marked, or the full scale with every degree named. */
function BoxNeck({ full }: { full?: boolean }) {
  const y = (string: number) => 6 + string * 11;
  return (
    <svg viewBox="0 0 200 67" className="w-full">
      {A_MINOR_BOX.map((_, s) => <line key={s} x1="0" x2="200" y1={y(s)} y2={y(s)} className="stroke-slate-700" strokeWidth="1" />)}
      {[0, 40, 80, 120, 160, 200].map((x) => <line key={x} x1={x} x2={x} y1={y(0)} y2={y(5)} className="stroke-slate-700" strokeWidth="1" />)}
      {A_MINOR_BOX.map((notes, s) => notes.filter(([, d]) => full || (d !== 1 && d !== 5)).map(([fret, d]) => {
        const x = (fret - 4) * 40 + 20;
        return (
          <g key={fret}>
            <circle cx={x} cy={y(s)} r="5" style={{ fill: full || d === 0 ? degreeColour(d) : "var(--color-slate-500)" }} />
            {full && <text x={x} y={y(s) + 2.3} textAnchor="middle" fontSize="6.5" fontWeight="700" style={{ fill: "var(--color-slate-950)" }}>{BOX_DEGREES[d]}</text>}
          </g>
        );
      }))}
    </svg>
  );
}

/** The same box of A minor at two levels, drawn for the adaptive view card. Illustration only. */
function AdaptiveViewMock() {
  return (
    <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      <div>
        <p className="mb-2 text-xs text-slate-500">Just starting</p>
        <BoxNeck />
      </div>
      <div>
        <p className="mb-2 text-xs text-slate-500">Further along</p>
        <BoxNeck full />
      </div>
    </div>
  );
}

export default function SchoolsHome() {
  return (
    <div className="landing app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/" />
        </div>

        {/* Hero */}
        <section className="relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:py-20">
        <Glow spots={[
          { tone: "sky", at: { right: "-6rem", top: "-8rem" }, size: "46rem", strength: 0.26 },
          { tone: "violet", at: { left: "-14rem", top: "-4rem" }, size: "34rem", strength: 0.16 },
          { tone: "teal", at: { right: "8rem", bottom: "-12rem" }, size: "26rem", strength: 0.14 },
        ]} />
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
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <span className="size-1.5 rounded-full bg-sky-300" /> Open beta
            </span>
            <p className="mt-2 text-sm text-slate-400">Free to try today. No sign-up, nothing to install.</p>
          </div>
          <div className="landing-rise relative pb-40 sm:pb-24" style={{ animationDelay: "120ms" }}>
            <Photo name="teacherTablet" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 50vw, 100vw" priority />
            <div className="absolute -bottom-2 left-0 w-[88%] sm:-left-6 sm:w-[60%]">
              <AfterClassMock />
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
                  <span className="text-xl text-slate-50" style={DISPLAY}>{o.title}{o.title === "Notes creator" && <BetaBadge />}</span>
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
        <section id="practice" aria-labelledby="practice-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <Eyebrow>AI autoplan<BetaBadge /></Eyebrow>
              <H2 id="practice-h">No more <span className="ls-accent italic text-sky-300">&ldquo;I didn&apos;t know what to practise.&rdquo;</span></H2>
              <p className="mt-4 max-w-lg text-slate-300">
                AI builds each student a practice plan for their level and the time they have: <Mark>new exercises every day</Mark>, each week building on the last. Short sessions with a timer, so ten minutes a day turns into a habit.
              </p>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
                <Check>Drills for the fretboard, scales, ear, voice and rhythm</Check>
                <Check>Every exercise opens with the diagram or backing it needs</Check>
                <Check>A daily reminder at the time the student picks</Check>
              </ul>
              <Link href="/plan" className="ls-btn mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="sparkles" size={16} /> Try the AI autoplan
              </Link>
              <p className="mt-3 text-xs text-slate-500">Works with the AI the student already uses: attunr gives them the prompt, they paste back the reply.</p>
            </div>
            <PlanDayCard />
          </div>
        </section>

        {/* Coming soon: progress tracker and accountability */}
        <section id="coming-soon" aria-labelledby="coming-soon-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>What we&apos;re building next</Eyebrow>
            <H2 id="coming-soon-h">Practice that <span className="ls-accent italic text-sky-300">doesn&apos;t slip.</span></H2>
          </div>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <SoonHeading icon="activity" tone="bg-teal-500/15 text-teal-300" title="Progress tracker" />
              <p className="text-sm leading-relaxed text-slate-400">attunr keeps track of the exercises each student works on. From that it shows <Mark tone="var(--color-teal-400)">how far they&apos;ve come</Mark> and suggests what to practise next.</p>
              <PracticeWeekMock />
            </li>
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <SoonHeading icon="bell" tone="bg-violet-500/15 text-violet-300" title="Accountability" />
              <p className="text-sm leading-relaxed text-slate-400">Reminders that keep students practising between lessons, and a nudge after a few quiet days, so <Mark tone="var(--color-violet-400)">one missed day doesn&apos;t become a missed month</Mark>.</p>
              <ReminderMock />
            </li>
            <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <SoonHeading icon="sliders-horizontal" tone="bg-amber-500/15 text-amber-300" title="Adaptive view" />
              <p className="text-sm leading-relaxed text-slate-400">The screen fits the student&apos;s level. Beginners see <Mark tone="var(--color-amber-400)">fewer notes and less detail</Mark>, and more comes in as they progress, so nobody gets lost in a busy screen.</p>
              <AdaptiveViewMock />
            </li>
          </ul>
        </section>

        {/* Interactive teaching resources */}
        <section id="resources" aria-labelledby="resources-h" className="relative isolate scroll-mt-6 sect-rule py-12 sm:py-16">
          <Glow spots={[{ tone: "amber", at: { left: "50%", top: "-4rem", marginLeft: "-20rem" }, size: "40rem", strength: 0.14 }]} />
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow tone="text-amber-300">Interactive teaching resources</Eyebrow>
            <H2 id="resources-h">Show the sound, <span className="ls-accent italic text-amber-300">not just the shape.</span></H2>
            <p className="mt-4 text-pretty text-slate-300">Bring up any scale, chord or position in a second, with no prep and no printouts. Every note plays as you tap it. Students open <Mark tone="var(--color-amber-400)">the same page at home</Mark>, so practice looks just like the lesson.</p>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <IdeasSection eyebrow="One method across your teachers" title={<>Switch teachers, <span className="ls-accent italic text-sky-300">keep the same colours.</span></>} tools={[PLAY_TOOLS]} />

        {/* Notes creator */}
        <section id="notes" aria-labelledby="notes-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="order-2 lg:order-1">
              <LessonNoteMock />
            </div>
            <div className="order-1 lg:order-2">
              <Eyebrow tone="text-teal-300">Notes creator<BetaBadge /></Eyebrow>
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
        <section id="online" aria-labelledby="online-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
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
            <div className="relative pb-40 sm:pb-24">
              <Photo name="teacherSmile" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 45vw, 100vw" />
              <div className="absolute -bottom-2 left-0 w-[88%] sm:-left-6 sm:w-[70%]">
                <LiveLessonMock />
              </div>
            </div>
          </div>
        </section>

        {/* White-labelling */}
        <section id="white-label" aria-labelledby="white-label-h" className="relative isolate scroll-mt-6 sect-rule py-12 sm:py-16">
          <Glow spots={[{ tone: "violet", at: { right: "-8rem", top: "0" }, size: "38rem", strength: 0.18 }]} />
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
        <section id="contact" aria-labelledby="contact-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="ls-card grid grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p id="contact-h" className="text-3xl text-slate-50" style={DISPLAY}>Bring attunr to your school</p>
              <p className="mt-2 text-sm text-slate-400">Leave your email and we&apos;ll get in touch to set it up with you for your teachers and students, under your brand if you want it. Your teachers can try the tools today, for free.</p>
            </div>
            <ContactForm source="schools" initialMessage={"Hi, I run a music school and I'd like to talk about using attunr for our teachers and students. Could you get in touch?"} cta="Get in touch" done="Thanks! We'll email you to talk about your school." note="We only use your email to reply. No newsletter." />
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
