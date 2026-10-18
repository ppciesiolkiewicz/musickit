import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import Wordmark from "@/components/Wordmark";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import HeroNeck from "@/components/landing/HeroNeck";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import { DOT_INK, degreeColour, degreeLabels } from "@/features/theory/scales";
import { FAMILIES, modeSteps } from "@/features/theory/theory";

const MODE_NAMES = ["Lydian", "Ionian", "Mixolydian", "Dorian", "Aeolian", "Phrygian", "Locrian"];

export const metadata: Metadata = {
  title: "Music Kit: Guitar Scales, Chords, CAGED, Tuner & Looper",
  description: "Find the sound you love, then learn to play it. Every scale, mode and chord on the guitar neck, coloured by each note's job and played back as you tap. Free in your browser; early access to the course is open.",
};

const DISPLAY: CSSProperties = { fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' };

/** What each degree does in a key: the idea behind the colours on every page. */
const JOBS = [
  { label: "R", job: "Home", text: "Where every phrase wants to land." },
  { label: "2", job: "Step", text: "Passing motion, a little lift." },
  { label: "3", job: "Mood", text: "Major or minor lives here." },
  { label: "4", job: "Lean", text: "Pulls down to the 3rd." },
  { label: "5", job: "Strength", text: "Power-chord solid." },
  { label: "6", job: "Colour", text: "Dorian's warmth, Aeolian's sigh." },
  { label: "7", job: "Pull", text: "Tension that points home." },
];

type Tool = { href: string; label: string; icon: IconName; text: string; art?: "degrees" | "loops" | "needle" };
const TOOLS: Tool[] = [
  { href: "/theory/scales", label: "Scales and modes", icon: "sliders-horizontal", text: "All 21 modes plus exotic scales in any key, with positions, pentatonic boxes and a fresh sample melody every click.", art: "degrees" },
  { href: "/looper", label: "Looper", icon: "repeat", text: "Plug in, record a loop, stack takes over drums, then mix with effects.", art: "loops" },
  { href: "/theory/chords", label: "Chords", icon: "music", text: "Every chord of the key and mode, with shapes and loops to play along." },
  { href: "/theory/caged", label: "CAGED", icon: "guitar", text: "The five open shapes joined into one map of the neck." },
  { href: "/theory/circle", label: "Circle of fifths", icon: "circle-dot", text: "Spin to a key, read its signature, relatives and chords." },
  { href: "/theory/drone", label: "Drone", icon: "audio-lines", text: "Hold one note and hear each mode's colour against it." },
  { href: "/tuner", label: "Tuner", icon: "gauge", text: "Needle and cents for guitar, bass, ukulele, violin or any note.", art: "needle" },
];
const IN_PROGRESS = [
  { href: "/theory", label: "Theory course" },
  { href: "/theory/improv", label: "Improvisation" },
  { href: "/cheatsheet", label: "Cheatsheet builder" },
];

const STEPS = [
  { n: "01", title: "Hear it", text: "Pick a mode and play it, or ask for a sample melody. Hold a drone underneath and the mood jumps out." },
  { n: "02", title: "See it", text: "The same notes on the neck, every one coloured by its job. Positions, CAGED shapes and boxes fall into place." },
  { n: "03", title: "Play it", text: "Loop a groove, tune up, and improvise over it. Practise what you like, the way you like." },
];

/** Style courses after the basic course: the scales, modes and chords that give each style its sound. */
const STYLES = [
  { name: "Surf rock", sound: "Phrygian dominant twang", soon: true },
  { name: "Funk", sound: "Dorian grooves, 9th chords", soon: true },
  { name: "Blues", sound: "The blues scale, dominant 7ths" },
  { name: "Jazz", sound: "ii–V–I, chord-scale thinking" },
  { name: "Neo-soul", sound: "Dorian and Lydian colours" },
  { name: "Metal", sound: "Phrygian and harmonic minor" },
  { name: "Flamenco", sound: "Phrygian dominant, rasgueado" },
  { name: "Bossa nova", sound: "Jazz shapes, syncopated thumb" },
  { name: "Reggae", sound: "Offbeat skank, minor grooves" },
  { name: "Country", sound: "Mixolydian licks" },
  { name: "Indie rock", sound: "Open chords, alt tunings" },
  { name: "Blues rock", sound: "Pentatonic boxes, classic licks" },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">{children}</p>;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-3xl leading-[1.08] text-slate-50 text-balance sm:text-[2.6rem]" style={DISPLAY}>{children}</h2>;
}

/** A degree dot like the ones on every neck in the app. */
function Dot({ d, label, size = 28 }: { d: number; label: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, fontSize: size * 0.42, background: degreeColour(d), color: DOT_INK, boxShadow: d === 0 ? "0 0 0 2px var(--color-slate-50)" : undefined }}>
      {label}
    </span>
  );
}

/** Small pictures for the bigger tool cards. */
function ToolArt({ art }: { art: Tool["art"] }) {
  if (art === "degrees") {
    // the seven major modes side by side, as on the scales page: the dots that move are what set each mode apart
    return (
      <div className="mt-auto flex flex-col gap-1.5 pt-6" aria-hidden>
        {MODE_NAMES.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <span className="w-20 shrink-0 text-xs text-slate-500">{name}</span>
            {degreeLabels(modeSteps(FAMILIES[0], FAMILIES[0].names.findIndex((n) => n.startsWith(name)))).map((l, i) => (
              <span key={i} className={l.length > 1 && l !== "R" ? "" : "opacity-45"}>
                <Dot d={i} label={l} size={24} />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (art === "loops") {
    // three stacked takes over a drum lane, each a degree colour
    const lanes = [
      { c: degreeColour(4), seed: 1.3 },
      { c: degreeColour(2), seed: 2.1 },
      { c: degreeColour(6), seed: 3.7 },
    ];
    return (
      <svg viewBox="0 0 240 78" className="mt-auto w-full pt-4" aria-hidden>
        {lanes.map((l, row) =>
          Array.from({ length: 40 }, (_, i) => {
            const h = 3 + Math.abs(Math.sin(i * l.seed) * Math.cos(i * 0.37 + row)) * 15;
            return <rect key={`${row}-${i}`} x={i * 6} y={row * 24 + 11 - h / 2} width={3.4} height={h} rx={1.5} fill={l.c} opacity={0.85} />;
          }),
        )}
        <line x1={150} x2={150} y1={0} y2={78} stroke="var(--color-sky-300)" strokeWidth={2} />
      </svg>
    );
  }
  if (art === "needle") {
    return (
      <svg viewBox="0 0 160 70" className="mx-auto mt-auto w-40 pt-3" aria-hidden>
        <path d="M14 64 A66 66 0 0 1 146 64" fill="none" stroke="var(--color-slate-700)" strokeWidth={6} strokeLinecap="round" />
        <path d="M66 4.6 A66 66 0 0 1 94 4.6" fill="none" stroke="var(--color-emerald-400)" strokeWidth={6} strokeLinecap="round" />
        <line x1={80} y1={64} x2={86} y2={10} stroke="var(--color-slate-100)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={80} cy={64} r={4.5} fill="var(--color-slate-100)" />
      </svg>
    );
  }
  return null;
}

/** A mock lesson note: what a student gets after an in-app lesson. Drawn, not a screenshot, so it follows the theme. */
function LessonNoteMock() {
  // A minor pentatonic, box 1 at the 5th fret: [string row from high e, fret offset, degree index, label]
  const box: [number, number, number, string][] = [
    [0, 0, 0, "R"], [0, 3, 2, "♭3"], [1, 0, 4, "5"], [1, 3, 6, "♭7"], [2, 0, 2, "♭3"], [2, 2, 3, "4"],
    [3, 0, 6, "♭7"], [3, 2, 0, "R"], [4, 0, 3, "4"], [4, 2, 4, "5"], [5, 0, 0, "R"], [5, 3, 2, "♭3"],
  ];
  return (
    <div className="relative rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4 shadow-2xl shadow-black/30 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Lesson note · week 3</p>
          <p className="text-lg text-slate-100" style={DISPLAY}>Minor pentatonic, box 1</p>
        </div>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">Preview</span>
      </div>
      <svg viewBox="0 0 260 132" className="w-full" role="img" aria-label="A minor pentatonic box at the 5th fret, notes coloured by degree">
        <rect x={20} y={6} width={232} height={120} rx={6} fill="var(--color-slate-900)" />
        {[0, 1, 2, 3, 4].map((f) => <line key={f} x1={20 + f * 58} x2={20 + f * 58} y1={6} y2={126} stroke="var(--color-slate-700)" strokeWidth={2} />)}
        {[0, 1, 2, 3, 4, 5].map((s) => <line key={s} x1={20} x2={252} y1={16 + s * 20} y2={16 + s * 20} stroke="var(--color-slate-500)" strokeOpacity={0.7} strokeWidth={0.8 + s * 0.3} />)}
        <text x={8} y={70} fontSize={10} fill="var(--color-slate-500)" textAnchor="middle">5</text>
        {box.map(([s, f, d, l]) => (
          <g key={`${s}-${f}`}>
            <circle cx={49 + f * 58} cy={16 + s * 20} r={9} fill={degreeColour(d)} stroke={d === 0 ? "var(--color-slate-50)" : "none"} strokeWidth={2} />
            <text x={49 + f * 58} y={16.5 + s * 20} fontSize={l.length > 1 ? 7.5 : 9} fontWeight={700} fill={DOT_INK} textAnchor="middle" dominantBaseline="central">{l}</text>
          </g>
        ))}
      </svg>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
        {[
          { done: true, t: "Box 1 up and down, landing on R" },
          { done: true, t: "Bend the 4 up to the 5" },
          { done: false, t: "Improvise over the A minor loop, 5 min a day" },
        ].map((x) => (
          <li key={x.t} className="flex items-start gap-2">
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${x.done ? "bg-emerald-500 text-slate-950" : "border border-slate-600"}`}>{x.done && <Icon name="check" size={11} />}</span>
            <span className={x.done ? "text-slate-400 line-through decoration-slate-600" : ""}>{x.t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">Next time: add the ♭5 and it becomes the blues scale.</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/" />
        </div>

        {/* Hero */}
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-20">
          <div className="landing-rise flex flex-col items-start">
            <a href="#early-access" className="group mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 py-1 pl-1.5 pr-3 text-xs text-sky-100 transition hover:border-sky-400">
              <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[11px] font-semibold text-slate-950">New</span>
              Early access to the course is open
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <h1 className="text-[2.6rem] leading-[1.02] tracking-tight text-slate-50 text-balance sm:text-6xl xl:text-[4.1rem]" style={DISPLAY}>
              Find the sound you love.
              <span className="mt-1 block italic text-sky-300">Then learn to play it.</span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-slate-300 sm:text-lg">
              Every scale, mode and chord on the guitar neck, each note coloured by the job it does, and played back the moment you tap it. Pick a mood, see it under your fingers, practise it over a drone or a loop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/theory/scales" className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Start exploring, free <Icon name="chevron-right" size={16} />
              </Link>
              <a href="#early-access" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
                <Icon name="sparkles" size={16} /> Get early access
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              {["Nothing to install", "Works on your phone", "Any key", "21 modes and counting"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Icon name="check" size={13} className="text-emerald-400" />{t}</li>
              ))}
            </ul>
          </div>
          <HeroNeck />
        </section>

        {/* The colour idea */}
        <section aria-labelledby="jobs" className="border-y border-slate-800/70 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <Eyebrow>One colour per degree</Eyebrow>
              <H2><span id="jobs">Every note has a job.</span></H2>
              <p className="mt-4 max-w-md text-slate-400">Learn the job, not the shape. The same seven colours run through every scale, chord and neck in the kit, so once you hear what the 3rd does in one key, you can find it in all twelve.</p>
            </div>
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {JOBS.map((j, i) => (
                <li key={j.label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:flex-col sm:items-start sm:gap-2">
                  <Dot d={i} label={j.label} size={34} />
                  <span className="flex flex-col gap-0.5 sm:gap-2">
                    <b className="text-sm font-semibold text-slate-100">{j.job}</b>
                    <span className="text-xs leading-snug text-slate-400">{j.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How practice works */}
        <section aria-label="How it works" className="py-12 sm:py-16">
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex flex-col gap-2 rounded-2xl p-1">
                <span className="text-5xl text-slate-700" style={DISPLAY}>{s.n}</span>
                <h3 className="text-xl text-slate-50" style={DISPLAY}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The kit */}
        <section aria-labelledby="kit" className="pb-12 sm:pb-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>In the kit today</Eyebrow>
              <H2><span id="kit">Everything you practise with,<br className="hidden sm:block" /> on one site.</span></H2>
            </div>
            <p className="max-w-sm text-sm text-slate-400">Free to use now. Every page works in any key and plays what it shows.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t, i) => (
              <li key={t.href} className={i === 0 ? "sm:col-span-2 lg:row-span-2" : i === 1 || i === TOOLS.length - 1 ? "sm:col-span-2" : ""}>
                <Link href={t.href} className="group flex h-full min-h-44 flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:-translate-y-0.5 hover:border-sky-400/70 hover:bg-slate-900">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 transition group-hover:bg-sky-500/20"><Icon name={t.icon} size={20} /></span>
                    <span className={`text-slate-50 ${i === 0 ? "text-2xl" : "text-lg"}`} style={DISPLAY}>{t.label}</span>
                    <span aria-hidden className="ml-auto text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-sky-300">→</span>
                  </span>
                  <span className={`text-slate-400 ${i === 0 ? "max-w-md text-base" : "text-sm"}`}>{t.text}</span>
                  {i === 0 && (
                    <span className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      {["Positions and pentatonic boxes", "Modes side by side", "Sample melodies, new every click", "Search by name or alias"].map((f) => (
                        <span key={f} className="flex items-center gap-2"><Icon name="check" size={14} className="text-emerald-400" />{f}</span>
                      ))}
                    </span>
                  )}
                  <ToolArt art={t.art} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">In the workshop</span>
            {IN_PROGRESS.map((p, i) => (
              <span key={p.href}>
                <Link href={p.href} className="text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-slate-200">{p.label}</Link>
                {i < IN_PROGRESS.length - 1 && <span className="ml-2 text-slate-700">·</span>}
              </span>
            ))}
          </p>
        </section>

        {/* Early access */}
        <section id="early-access" aria-labelledby="ea" className="scroll-mt-6 pb-12 sm:pb-16">
          <div className="relative overflow-hidden rounded-[2rem] border border-sky-500/30 bg-slate-900/70 p-6 sm:p-10 lg:p-12">
            {/* a wash of the seven degree colours behind the offer */}
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-[36rem] rounded-full opacity-25 blur-3xl" style={{ background: `conic-gradient(from 200deg, ${[0, 1, 2, 3, 4, 5, 6, 1].map(degreeColour).join(",")})` }} />
            <div className="relative grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
                <Eyebrow>Early access · limited</Eyebrow>
                <H2><span id="ea">The basic course,<br /> <span className="italic text-sky-300">plus every style that follows.</span></span></H2>
                <p className="mt-5 max-w-xl text-slate-300">
                  Video lessons that teach the fretboard by scale degree: scales, modes and intervals, built on the tools above so you know how to keep practising on your own. Join early and every style course is yours free when it launches.
                </p>
                <ul className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  {[
                    { icon: "graduation-cap" as const, t: "The fretboard by degree", s: "Scales, modes and intervals, start to finish" },
                    { icon: "sparkles" as const, t: "Style courses free", s: "For early adopters, as each one launches" },
                    { icon: "guitar" as const, t: "Built on the kit", s: "Every lesson opens the tool it uses" },
                    { icon: "headphones" as const, t: "Shape what's next", s: "Early members pick the next styles" },
                  ].map((x) => (
                    <li key={x.t} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300"><Icon name={x.icon} size={18} /></span>
                      <span><b className="block font-semibold text-slate-100">{x.t}</b><span className="text-slate-400">{x.s}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-center gap-6 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5 sm:p-6">
                <div>
                  <p className="text-xl text-slate-50" style={DISPLAY}>Save your spot</p>
                  <p className="mt-1 text-sm text-slate-400">Tell us what you want first and we&apos;ll email you when it opens.</p>
                </div>
                <EarlyAccessForm source="offer" />
              </div>
            </div>

            <div className="relative mt-10 border-t border-slate-800 pt-8">
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-500">Style courses on the way, free for early adopters</p>
              <ul className="flex flex-wrap gap-2">
                {STYLES.map((s, i) => (
                  <li key={s.name} className={`group flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm ${s.soon ? "border-sky-500/50 bg-sky-500/10" : "border-slate-700/80 bg-slate-900/40"}`}>
                    <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: degreeColour((i % 6) + 1) }} aria-hidden />
                    <span className="font-medium text-slate-100">{s.name}</span>
                    <span className="hidden text-xs text-slate-500 md:inline">{s.sound}</span>
                    {s.soon && <span className="rounded-full bg-sky-400 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-950">Soon</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Coming next: lessons in the app */}
        <section aria-labelledby="lessons" className="grid items-center gap-10 pb-16 sm:pb-24 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1"><LessonNoteMock /></div>
          <div className="order-1 lg:order-2">
            <Eyebrow>Coming next</Eyebrow>
            <H2><span id="lessons">Lessons that happen inside the kit.</span></H2>
            <p className="mt-4 text-slate-400">Private lessons with teachers who bring up any scale, neck or loop in a second, and show you how to practise on your own between lessons.</p>
            <ul className="mt-6 flex flex-col gap-4">
              {[
                { t: "Notes that look like pages", s: "After each lesson: diagrams, exercises and what to try next, ready to look back on." },
                { t: "Any teacher, same progress", s: "Your notes travel with you, so a new teacher picks up where the last one stopped." },
                { t: "Songs by mode", s: "Which songs use a mode, the idea behind the riff, and you work it out by ear." },
              ].map((x, i) => (
                <li key={x.t} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: degreeColour(i * 2 + 1) }} />
                  <span><b className="block font-semibold text-slate-100">{x.t}</b><span className="text-sm text-slate-400">{x.s}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call */}
        <section className="pb-16 text-center sm:pb-24">
          <div className="mx-auto mb-6 flex w-fit gap-2" aria-hidden>
            {["R", "2", "3", "4", "5", "6", "7"].map((l, i) => <Dot key={l} d={i} label={l} size={30} />)}
          </div>
          <p className="mx-auto max-w-2xl text-4xl leading-tight text-slate-50 sm:text-5xl" style={DISPLAY}>
            Pick a key. Pick a mood. <span className="italic text-sky-300">Play.</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/theory/scales" className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
              Start exploring, free <Icon name="chevron-right" size={16} />
            </Link>
            <a href="#early-access" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-400">
              Get early access
            </a>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-800/70 py-8 text-xs text-slate-500 sm:flex-row">
          <Wordmark className="text-xl" />
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {[...TOOLS.slice(0, 5), { href: "/tuner", label: "Tuner" }, { href: "/looper", label: "Looper" }]
              .filter((l, i, a) => a.findIndex((x) => x.href === l.href) === i)
              .map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-300">{l.label}</Link>)}
          </nav>
          <p>Made for guitarists who&apos;d rather play.</p>
        </footer>
      </div>
    </div>
  );
}
