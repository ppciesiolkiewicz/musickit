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
import { DiscountBadge } from "@/components/ui";
import { EARLY_OFFER, PRICING, earlyCents } from "@/features/account/pricing";
import { DEFAULT_PLAN_ID, dollars, pricedWithYou, studentsLabel, trialLabel, type Plan } from "@/features/account/plans";
import TourCard from "@/features/intro/TourCard";
import type { VideoId } from "@/features/intro/data";
import { FOUNDING_OFFER, FOUNDING_TRIAL_DAYS } from "@/lib/foundingOffer";
import { FIRST_STUDENTS, FIRST_STUDENTS_LINE } from "@/lib/studentOffer";

/*
 * The two home pages, / (music schools) and /players (solo musicians), in one shape: the Practice plan first, then
 * what you get, the quick tour, how it works, Notes, the other teaching resources in one strip, the price, the ending.
 * Design: docs/superpowers/specs/2026-11-14-autoplan-centre-design.md. What each page may promise is the offer on
 * /dev/kickstarter (src/features/devtools/model/kickstarterStudents.ts for solo musicians, kickstarter.ts for teachers
 * and schools): say nothing here that isn't there.
 */

export type Audience = "schools" | "players";

type Card = { icon: IconName; title: string; text: string };

/** What the offer stands on, three cards a page: the pillars of /dev/kickstarter. */
const PILLARS: Record<Audience, Card[]> = {
  players: [
    { icon: "sparkles", title: "A daily plan fitted to you", text: "Open attunr and today's practice is ready: what to work on, and for how long. It starts where you are, a first week included, and nobody is tested to get in." },
    { icon: "bell", title: "A daily habit you can see", text: "A daily reminder at the time you choose, a timer for the day's practice and a day streak. There are no points and no score: progress is what gets easier to play or sing." },
    { icon: "play", title: "Exercises that answer back", text: "Every exercise plays with you, listens to you and shows what it heard: a neck that shows the notes, a tab that plays along, a staff that draws your voice from the microphone." },
  ],
  schools: [
    { icon: "sparkles", title: "A week of practice for each student", text: "Seven days of short exercises, put together from attunr's library to fit where that student is. You steer it with one slider for each topic before each new week." },
    { icon: "file-text", title: "Lesson notes that play", text: "One page with today's scales, chords and exercises, sent to the student as a link. They open it at home and practise with it." },
    { icon: "guitar", title: "The exact material at home", text: "This scale, in this key, in this position, in front of the student. There is nothing to transpose in their head, so the minutes they practise count for more." },
  ],
};

/** The three steps of the plan: a solo musician makes their own, a teacher makes a student's. */
const STEPS: Record<Audience, Card[]> = {
  players: [
    { icon: "list", title: "Answer a few questions", text: "What you play or sing, where you are in each topic, and how many minutes a day you have." },
    { icon: "sparkles", title: "attunr builds today's plan", text: "attunr picks exercises from its library for the next thing to learn in each topic. Each day is a bit different from the day before." },
    { icon: "check", title: "Practise, then rate it", text: "Each exercise opens with the tools it needs. Rate how it went, and the next plan starts from there." },
  ],
  schools: [
    { icon: "list", title: "Add a student", text: "Their name, their email and a few questions about what they play and where they are. The student gets a link by email." },
    { icon: "sparkles", title: "attunr builds their week", text: "Seven days of exercises from its library, for where that student is. Each exercise opens with the tools it needs." },
    { icon: "sliders-horizontal", title: "Steer the next week", text: "The student rates each exercise. You move one slider for each topic to where they are now, and the next plan follows both." },
  ],
};

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
  /** the heading over the three pillars */
  offerTitle: ReactNode;
  /** which quick tour the page shows, with its heading and one line */
  video: VideoId;
  videoTitle: ReactNode;
  videoText: string;
  stepsTitle: ReactNode;
}> = {
  schools: {
    eyebrow: "Guitar and voice",
    title: <>A week of practice <span className="ls-accent block italic text-sky-300">for every student.</span></>,
    lead: <>Add a student, and attunr puts together seven days of <Mark>short exercises that fit where they are</Mark>, each with the diagram, drone or backing it needs. Before each new week you set where the student is now, and the next plan follows.</>,
    planNote: <>You use the same app as your students, so you see exactly what a student practises at home, and <Mark tone="var(--color-violet-400)">how they rated each exercise</Mark>.</>,
    heroNote: <>Free while in beta. Log in with your email or Google. <Link href="/kickstarter" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-200">Founding partners</Link> get a {FOUNDING_TRIAL_DAYS}-day trial and a locked-in price.</>,
    notesTitle: <>Lesson notes <span className="ls-accent italic text-teal-300">before the student leaves.</span></>,
    notesText: <>In the last two minutes of a lesson, a teacher lays out today&apos;s chords, scales and positions on one page, then <Mark tone="var(--color-teal-400)">sends it to the student as a link</Mark>. Every diagram on it plays.</>,
    notesPoints: ["Necks, chord boxes, CAGED shapes, the circle of fifths", "Change the key and the whole page follows", "One link, nothing to install"],
    offerTitle: <>What your students <span className="ls-accent italic text-sky-300">take home.</span></>,
    video: "teachers",
    videoTitle: <>See how a student&apos;s week <span className="ls-accent italic text-violet-300">is made.</span></>,
    videoText: "A short tour with sound: adding a student, their week, the sliders and a lesson note.",
    stepsTitle: <>How a student&apos;s plan <span className="ls-accent italic text-sky-300">works.</span></>,
  },
  players: {
    eyebrow: "Guitar and voice",
    title: <>Know what to practise, <span className="ls-accent block italic text-sky-300">every day.</span></>,
    lead: <>Answer a few questions, and attunr puts your practice together: <Mark>short exercises for your level and your time</Mark>, each with the diagram, drone or backing it needs. Every plan builds on how the last one went.</>,
    planNote: <>A timer runs through the day&apos;s exercises, and a daily reminder can nudge you at the time you pick.</>,
    heroNote: <>Free while in beta. When paid plans open, the first {FIRST_STUDENTS} people who sign up pay <a href="#pricing" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-200">{FIRST_STUDENTS_LINE}</a>.</>,
    notesTitle: <>Keep what you learn <span className="ls-accent italic text-teal-300">on one page.</span></>,
    notesText: <>Put the chords, scales and positions you are working on into one page of notes. <Mark tone="var(--color-teal-400)">Every diagram on it plays</Mark>, and you can share it as a link.</>,
    notesPoints: ["Necks, chord boxes, CAGED shapes, the circle of fifths", "Change the key and the whole page follows", "Opens on any device"],
    offerTitle: <>What you get, <span className="ls-accent italic text-sky-300">every day.</span></>,
    video: "solo",
    videoTitle: <>See how a day of practice <span className="ls-accent italic text-violet-300">goes.</span></>,
    videoText: "A short tour with sound: the questions, today's plan, the exercises and the daily habit.",
    stepsTitle: <>How the plan <span className="ls-accent italic text-sky-300">works.</span></>,
  },
};

const PRIMARY = "ls-btn ls-btn-primary ls-glint inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300";
const SECONDARY = "ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40";

/** The two home pages, as the switch at the top of each. The footer has the same pair under "attunr for". */
const AUDIENCES: { audience: Audience; href: string; label: string }[] = [
  { audience: "schools", href: "/", label: "Music schools" },
  { audience: "players", href: "/players", label: "Solo musicians" },
];

/** "attunr for [Music schools | Solo musicians]": the way between the two home pages, above the hero's title. */
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

export default function AutoplanHome({ audience, plans, ending }: { audience: Audience; /** the plans anyone can choose (`publicPlans`), or null when the plans table can't be read */ plans: Plan[] | null; /** the page's own last part, before the footer */ ending: ReactNode }) {
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

        {/* What you get: the three pillars of the offer */}
        <section id="offer" aria-labelledby="offer-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>What you get</Eyebrow>
            <H2 id="offer-h">{c.offerTitle}</H2>
          </div>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {PILLARS[audience].map((x) => (
              <li key={x.title} className="ls-card flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-300"><Icon name={x.icon} size={20} /></span>
                <h3 className="text-xl text-slate-50" style={DISPLAY}>{x.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{x.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The quick tour for this page's reader */}
        <section id="tour" aria-labelledby="tour-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
            <div>
              <Eyebrow tone="text-violet-300">Quick tour</Eyebrow>
              <H2 id="tour-h">{c.videoTitle}</H2>
              <p className="mt-4 max-w-lg text-slate-300">{c.videoText}</p>
            </div>
            <TourCard video={c.video} />
          </div>
        </section>

        {/* How the plan works */}
        <section id="plan" aria-labelledby="plan-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Practice plan<BetaBadge /></Eyebrow>
            <H2 id="plan-h">{c.stepsTitle}</H2>
          </div>
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {STEPS[audience].map((s, i) => (
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

        <Pricing audience={audience} plans={plans} />

        {ending}

        <SiteFooter />
      </div>
    </div>
  );
}

/**
 * What a solo musician pays and what a teacher or a school pays, with the money-back guarantee. The prices are the rows
 * of the plans table, the ones /dev/kickstarter/teachers and /dev/costs list (`plans`; null when it can't be read, and
 * then the card says so and shows no number). The early price is from lib/studentOffer.ts, the founding partner's from
 * lib/foundingOffer.ts, the guarantee from features/account/pricing.ts.
 */
/** "$3 a month or $18 a year": both at the early price (`EARLY_OFFER`). */
const earlyBoth = (p: Plan) => `${dollars(earlyCents(p.monthCents))} a month or ${dollars(earlyCents(p.yearCents))} a year`;

function Pricing({ audience, plans }: { audience: Audience; plans: Plan[] | null }) {
  const p = PRICING.player;
  const solo = plans?.find((x) => x.id === DEFAULT_PLAN_ID) ?? null;
  const teaching = plans?.filter((x) => x.role === "teacher") ?? [];
  const first = solo ?? teaching[0];
  const trial = first ? trialLabel(first) : null;
  const MISSING = "The prices can't be shown right now. Load the page again in a moment.";
  const playerPoints = [
    "Daily plans are unlimited: a new one every day, and another the same day when you ask",
    "Every tool, lesson and drill, as much as you like",
    `The first ${FIRST_STUDENTS} people who sign up get the early price when paid plans open: ${FIRST_STUDENTS_LINE}`,
    "The early price is locked in: it doesn't go up while you stay subscribed",
  ];
  const schoolPoints = [
    "You pay by how many students you give a plan each month, not by how many plans you make",
    "Students you didn't give a plan this month stay on your list for free",
    "Weekly practice plans and lesson notes for your students",
    "Every tool and lesson, for you and your students",
    `Founding partners get a ${FOUNDING_TRIAL_DAYS}-day trial, then ${FOUNDING_OFFER}, locked in`,
  ];
  const schools = audience === "schools";
  return (
    <section id="pricing" aria-labelledby="pricing-h" className="scroll-mt-6 sect-rule py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow tone="text-emerald-300">Pricing</Eyebrow>
        <H2 id="pricing-h">{schools ? <>Pay by student, <span className="ls-accent italic text-emerald-300">not by plan.</span></> : <>Pay by the month, <span className="ls-accent italic text-emerald-300">or by the year.</span></>}</H2>
        <p className="mt-4 text-slate-300">Free while attunr is in beta. These are the prices from launch.</p>
        <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
          <DiscountBadge percent={EARLY_OFFER.percentOff} />
          <span>Early price for the first {EARLY_OFFER.students} students and the first {EARLY_OFFER.schools} schools: half price, monthly or yearly, locked in.</span>
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="ls-card flex flex-col gap-5 rounded-3xl border border-emerald-400/30 bg-slate-900/60 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{schools ? "Teachers and music schools" : "Solo musicians"}</p>
            {schools ? (
              teaching.length > 0 && (
                <ul className="mt-3 flex flex-col divide-y divide-slate-800">
                  {teaching.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                      <span className="text-2xl text-slate-50" style={DISPLAY}>{t.name}</span>
                      <span className="text-sm text-slate-400">{studentsLabel(t)}</span>
                      <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-slate-200">
                        {pricedWithYou(t) ? "Price set with you" : <>{dollars(earlyCents(t.monthCents))} a month <s className="text-sm text-slate-500"><span className="sr-only">instead of </span>{dollars(t.monthCents)}</s></>}
                        <DiscountBadge percent={EARLY_OFFER.percentOff} />
                        {!pricedWithYou(t) && <span className="text-sm text-slate-400">or {dollars(earlyCents(t.yearCents))} a year</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              solo && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-50" style={DISPLAY}>
                  <span className="text-5xl sm:text-6xl">{dollars(earlyCents(solo.monthCents))}</span>
                  <s className="text-2xl text-slate-500"><span className="sr-only">instead of </span>{dollars(solo.monthCents)}</s>
                  <span className="text-xl text-slate-300">a month</span>
                  <DiscountBadge percent={EARLY_OFFER.percentOff} size="lg" />
                </p>
              )
            )}
            <p className="mt-2 text-sm text-slate-400">
              {schools
                ? (teaching.length > 0 ? <>{trial && `${trial}. `}{solo && `Solo musicians pay ${earlyBoth(solo)}.`}</> : MISSING)
                : (solo ? <>Or {dollars(earlyCents(solo.yearCents))} a year, paid once.{trial && ` ${trial}.`}</> : MISSING)}
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-slate-300">
            {(schools ? schoolPoints : playerPoints).map((t) => <Check key={t} tone="text-emerald-300">{t}</Check>)}
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-4">
            {schools
              ? <a href="#contact" className={PRIMARY}>Talk to us <Icon name="chevron-right" size={16} /></a>
              : <Link href="/plan" className={PRIMARY}>Start your plan <Icon name="chevron-right" size={16} /></Link>}
            {schools && <Link href="/kickstarter" className="text-sm text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200">Founding partners</Link>}
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
        <Founder id="contact-h" title="Bring attunr to your school" text={<>I&apos;m Pio, and I build attunr. Leave your email and I&apos;ll get in touch to set it up for your teachers and students. I&apos;m looking for founding partners: teachers and schools who use attunr early and say what gets built first. Your teachers can start a plan today, for free.</>}>
          <ContactForm source="schools" initialMessage={"Hi Pio, I run a music school and I'd like to talk about using attunr for our teachers and students. Could you get in touch?"} cta="Talk to us" done="Thanks. I'll email you to talk about your school." note="I only use your email to reply. No newsletter." />
        </Founder>
      </div>
    </section>
  );
}

/** The solo musicians' page's ending: why attunr exists, then the plan again. */
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
