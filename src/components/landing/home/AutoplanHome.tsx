import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import ContactForm from "@/components/landing/ContactForm";
import Founder from "@/components/landing/Founder";
import Photo from "@/components/landing/Photo";
import Glow from "@/components/landing/Glow";
import SiteFooter from "@/components/landing/SiteFooter";
import { BetaBadge, DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import { LessonNoteMock } from "@/components/landing/LessonMocks";
import { Check, PlanDayCard } from "./PracticeSections";
import { PRICING } from "@/features/account/pricing";

/*
 * The two home pages, / (music schools) and /players, in one shape: the Practice plan first, then how it works, then
 * Notes, then the other teaching resources in one strip, then the ending. Design:
 * docs/superpowers/specs/2026-11-14-autoplan-centre-design.md.
 */

export type Audience = "schools" | "players";

/** The three steps of the plan, the same for both pages. */
const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "list", title: "Answer a few questions", text: "What you play, where you are with it, and how many minutes a day you have." },
  { icon: "sparkles", title: "attunr builds your plan", text: "attunr picks exercises from its library for the steps you are on in each topic." },
  { icon: "check", title: "Practise, then rate it", text: "Each exercise opens with the tools it needs. Rate how it went, and the next plan starts from there." },
];

/** The other teaching resources: one tile each, all of them in Practice after logging in. */
const RESOURCES: { icon: IconName; label: string; href: string }[] = [
  { icon: "graduation-cap", label: "Course", href: "/course" },
  { icon: "waves", label: "Scales", href: "/theory/scales" },
  { icon: "grid-3x3", label: "Chords", href: "/theory/chords" },
  { icon: "layers", label: "CAGED", href: "/theory/caged" },
  { icon: "gauge", label: "Tuner", href: "/tuner" },
  { icon: "audio-lines", label: "Metronome & drone", href: "/theory/metronome-drone" },
  { icon: "drum", label: "Backing tracks", href: "/theory/backing" },
  { icon: "repeat", label: "Looper", href: "/looper" },
  { icon: "mic", label: "Singing drills", href: "/theory/singing" },
  { icon: "ear", label: "Ear training", href: "/theory/ears" },
];

/** What changes between the two pages. */
const COPY: Record<Audience, {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  planNote: ReactNode;
  /** under the Open beta badge in the hero */
  heroNote: ReactNode;
  notesTitle: ReactNode;
  notesText: ReactNode;
  notesPoints: string[];
}> = {
  schools: {
    eyebrow: "Guitar and voice",
    title: <>A practice plan for every student, <span className="ls-accent block italic text-sky-300">every day.</span></>,
    lead: <>Each student answers a few questions, and attunr puts their practice together: <Mark>short exercises for their level and their time</Mark>, each with the diagram, drone or backing it needs. Every plan builds on how the last one went.</>,
    planNote: <>Teachers use the same app as their students, so they see exactly what a student practises at home. It can carry <Mark tone="var(--color-violet-400)">your school&apos;s name</Mark>.</>,
    heroNote: <>Free while in beta. Log in with your email or Google. <a href="#pricing" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-200">School pricing</a> is by agreement.</>,
    notesTitle: <>Lesson notes <span className="ls-accent italic text-teal-300">before the student leaves.</span></>,
    notesText: <>In the last two minutes of a lesson, a teacher lays out today&apos;s chords, scales and positions on one page, then <Mark tone="var(--color-teal-400)">sends it to the student as a link</Mark>. Every diagram on it plays.</>,
    notesPoints: ["Necks, chord boxes, CAGED shapes, the circle of fifths", "Change the key and the whole page follows", "One link, nothing to install"],
  },
  players: {
    eyebrow: "Guitar and voice",
    title: <>Know what to practise, <span className="ls-accent block italic text-sky-300">every day.</span></>,
    lead: <>Answer a few questions, and attunr puts your practice together: <Mark>short exercises for your level and your time</Mark>, each with the diagram, drone or backing it needs. Every plan builds on how the last one went.</>,
    planNote: <>A timer runs through the day&apos;s exercises, and a daily reminder can nudge you at the time you pick.</>,
    heroNote: <>Free while in beta. Then {PRICING.player.price} {PRICING.player.period}, with a <a href="#pricing" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-200">{PRICING.player.guaranteeDays}-day money-back guarantee</a>.</>,
    notesTitle: <>Keep what you learn <span className="ls-accent italic text-teal-300">on one page.</span></>,
    notesText: <>Put the chords, scales and positions you are working on into one page of notes. <Mark tone="var(--color-teal-400)">Every diagram on it plays</Mark>, and you can share it as a link.</>,
    notesPoints: ["Necks, chord boxes, CAGED shapes, the circle of fifths", "Change the key and the whole page follows", "Opens on any device"],
  },
};

const PRIMARY = "ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300";
const SECONDARY = "ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40";

/** The two home pages, as the switch at the top of each. The footer has the same pair under "attunr for". */
const AUDIENCES: { audience: Audience; href: string; label: string }[] = [
  { audience: "schools", href: "/", label: "Music schools" },
  { audience: "players", href: "/players", label: "Players" },
];

/** "attunr for [Music schools | Players]": the way between the two home pages, above the hero's title. */
function AudienceSwitch({ current }: { current: Audience }) {
  return (
    <nav aria-label="attunr for" className="mb-6 flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate-400">attunr for</span>
      <span className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-1 backdrop-blur">
        {AUDIENCES.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={a.audience === current ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${a.audience === current ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-slate-50"}`}
          >
            {a.label}
          </Link>
        ))}
      </span>
    </nav>
  );
}

function PlanButtons() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href="/plan" className={PRIMARY}>Start your plan <Icon name="chevron-right" size={16} /></Link>
      <Link href="/demo" className={SECONDARY}><Icon name="play" size={16} /> See an example plan</Link>
    </div>
  );
}

export default function AutoplanHome({ audience, ending }: { audience: Audience; /** the page's own last part, before the footer */ ending: ReactNode }) {
  const c = COPY[audience];
  return (
    <div className="landing app-bg isolate min-h-screen overflow-clip text-slate-200">
      <PreloadPiano />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active={audience === "schools" ? "/" : "/players"} />
        </div>

        {/* Hero: the Practice plan */}
        <section className="relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-20">
          <Glow spots={[
            { tone: "sky", at: { right: "-6rem", top: "-8rem" }, size: "46rem", strength: 0.26 },
            { tone: "violet", at: { left: "-14rem", top: "-4rem" }, size: "34rem", strength: 0.16 },
            { tone: "teal", at: { right: "8rem", bottom: "-12rem" }, size: "26rem", strength: 0.14 },
          ]} />
          <div className="landing-rise flex flex-col items-start">
            <AudienceSwitch current={audience} />
            <Eyebrow big>{c.eyebrow}</Eyebrow>
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>{c.title}</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">{c.lead}</p>
            <PlanButtons />
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <span className="size-1.5 rounded-full bg-sky-300" /> Open beta
            </span>
            <p className="mt-2 max-w-md text-sm text-slate-400">{c.heroNote}</p>
          </div>
          <div className="landing-rise relative" style={{ animationDelay: "120ms" }}>
            {audience === "schools" ? (
              <>
                <Photo name="teacherTablet" className="ls-photo aspect-4/3 rounded-3xl border border-slate-800" sizes="(min-width: 1024px) 50vw, 100vw" priority />
                <div className="relative -mt-12 ml-auto w-[92%] sm:-mt-40 sm:-mr-4 sm:w-[64%]"><PlanDayCard /></div>
              </>
            ) : (
              <PlanDayCard />
            )}
          </div>
        </section>

        {/* How the plan works */}
        <section id="plan" aria-labelledby="plan-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Practice plan<BetaBadge /></Eyebrow>
            <H2 id="plan-h">How the plan <span className="ls-accent italic text-sky-300">works.</span></H2>
          </div>
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="ls-card flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-300"><Icon name={s.icon} size={20} /></span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Step {i + 1}</span>
                </span>
                <span className="text-xl text-slate-50" style={DISPLAY}>{s.title}</span>
                <span className="text-sm leading-relaxed text-slate-400">{s.text}</span>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-2xl text-center text-slate-300">{c.planNote}</p>
          <div className="flex justify-center"><PlanButtons /></div>
        </section>

        {/* Notes, the second tool */}
        <section id="notes" aria-labelledby="notes-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="order-2 lg:order-1">
              <LessonNoteMock startOn="imp" />
            </div>
            <div className="order-1 lg:order-2">
              <Eyebrow tone="text-teal-300">Notes<BetaBadge /></Eyebrow>
              <H2 id="notes-h">{c.notesTitle}</H2>
              <p className="mt-4 max-w-lg text-slate-300">{c.notesText}</p>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
                {c.notesPoints.map((p) => <Check key={p} tone="text-teal-300">{p}</Check>)}
              </ul>
              <Link href="/teachers/studio?notes=1" className={`${SECONDARY} mt-8`}>
                <Icon name="file-text" size={16} /> Open Notes
              </Link>
            </div>
          </div>
        </section>

        {/* Other teaching resources, in one strip */}
        <section id="resources" aria-labelledby="resources-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <Eyebrow tone="text-amber-300">Other teaching resources</Eyebrow>
              <H2 id="resources-h">The rest is <span className="ls-accent italic text-amber-300">in Practice.</span></H2>
              <p className="mt-4 text-slate-300">The plan opens these inside its exercises. In Practice you can open any of them yourself.</p>
            </div>
            <Link href="/practice" className={SECONDARY}><Icon name="grid-3x3" size={16} /> Open Practice</Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {RESOURCES.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="ls-card flex h-full items-center gap-3 metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-600">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-300"><Icon name={r.icon} size={16} /></span>
                  <span className="text-sm text-slate-100">{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Pricing audience={audience} />

        {ending}

        <SiteFooter />
      </div>
    </div>
  );
}

/** What a player pays and what a school gets, with the money-back guarantee. Numbers from features/account/pricing.ts. */
function Pricing({ audience }: { audience: Audience }) {
  const p = PRICING.player;
  const playerPoints = [
    `${p.plansPerMonth} AI autoplans a month: one for every week, and spare ones to start again`,
    `Spend them on AI-written notes instead if you like: up to ${p.notesPerMonth} a month (coming soon)`,
    "Every tool, lesson and drill, as much as you like",
    "After the year you keep your plans and every tool. Top up only for new autoplans.",
  ];
  const schoolPoints = [
    "A larger autoplan allowance, shared by your teachers and students",
    "Invite students and teachers, and assign a plan to a student",
    "See what each student practises at home",
    "Every tool and lesson for everyone, under your school's name",
  ];
  const schools = audience === "schools";
  return (
    <section id="pricing" aria-labelledby="pricing-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow tone="text-emerald-300">Pricing</Eyebrow>
        <H2 id="pricing-h">{schools ? <>One plan for the school, <span className="ls-accent italic text-emerald-300">more autoplans.</span></> : <>One price, <span className="ls-accent italic text-emerald-300">a whole year.</span></>}</H2>
        <p className="mt-4 text-slate-300">Free while attunr is in beta. These are the prices from launch.</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="ls-card flex flex-col gap-5 rounded-3xl border border-emerald-400/30 bg-slate-900/60 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{schools ? "Music schools" : "Players"}</p>
            {schools ? (
              <p className="mt-2 text-3xl text-slate-50 sm:text-4xl" style={DISPLAY}>Priced for your school</p>
            ) : (
              <p className="mt-2 text-slate-50" style={DISPLAY}><span className="text-5xl sm:text-6xl">{p.price}</span> <span className="text-xl text-slate-300">{p.period}</span></p>
            )}
            <p className="mt-2 text-sm text-slate-400">{schools ? <>A quote for your teachers and students. Players on their own pay {p.price} {p.period}.</> : "Paid once. No monthly charge, and we never renew you without asking."}</p>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-slate-300">
            {(schools ? schoolPoints : playerPoints).map((t) => <Check key={t} tone="text-emerald-300">{t}</Check>)}
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-4">
            {schools
              ? <a href="#contact" className={PRIMARY}>Talk to us <Icon name="chevron-right" size={16} /></a>
              : <Link href="/plan" className={PRIMARY}>Start your plan <Icon name="chevron-right" size={16} /></Link>}
            <Link href="/terms" className="text-sm text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200">Terms of use</Link>
          </div>
        </div>
        <div className="ls-card flex flex-col justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Icon name="check" size={24} /></span>
          <p className="text-2xl text-slate-50" style={DISPLAY}>{p.guaranteeDays}-day money-back guarantee</p>
          <p className="text-sm leading-relaxed text-slate-300">Not for you? Email us within {p.guaranteeDays} days of paying and the whole payment comes back. No reason needed.</p>
          <p className="text-sm leading-relaxed text-slate-400">attunr is a small business run by its founder on an Australian ABN. If it ever closes, you get 60 days&apos; notice, time to download your plans and notes, and the months left on your subscription back.</p>
        </div>
      </div>
    </section>
  );
}

/** The music schools page's ending: talk to us. */
export function SchoolsEnding() {
  return (
    <section id="contact" aria-labelledby="contact-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
      <div className="ls-card rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-8">
        <Founder id="contact-h" title="Bring attunr to your school" text={<>I&apos;m Pio, and I build attunr. Leave your email and I&apos;ll get in touch to set it up for your teachers and students, under your school&apos;s name if you want it. Your teachers can start a plan today, for free.</>}>
          <ContactForm source="schools" initialMessage={"Hi Pio, I run a music school and I'd like to talk about using attunr for our teachers and students. Could you get in touch?"} cta="Talk to us" done="Thanks. I'll email you to talk about your school." note="I only use your email to reply. No newsletter." />
        </Founder>
      </div>
    </section>
  );
}

/** The players page's ending: why attunr exists, then the plan again. */
export function PlayersEnding() {
  return (
    <>
      <section aria-labelledby="story-h" className="sect-rule py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Eyebrow tone="text-amber-300">Why I built attunr</Eyebrow>
          <H2 id="story-h">I was stuck, so I built the practice app I needed.</H2>
          <blockquote className="mt-6 border-l-2 border-amber-400/60 pl-5 text-lg italic leading-relaxed text-slate-300" style={DISPLAY}>
            “I practised and practised and wasn&apos;t getting better. I kept running out of ideas for what to work on. What works for me is drills: repeating them until my hands know them, and understanding why they work. So I built attunr, and a plan that brings me new ones every day. <Mark tone="var(--color-amber-400)">It&apos;s not a game. It&apos;s practice.</Mark>”
          </blockquote>
          <p className="mt-3 pl-5 text-sm text-slate-400"><b className="text-slate-200">Pio</b>, founder of attunr</p>
        </div>
      </section>
      <section className="pb-16 pt-4 text-center sm:pb-24">
        <p className="mx-auto max-w-2xl text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>
          Ten minutes a day, <span className="ls-accent italic text-sky-300">planned for you.</span>
        </p>
        <div className="flex justify-center"><PlanButtons /></div>
      </section>
    </>
  );
}
