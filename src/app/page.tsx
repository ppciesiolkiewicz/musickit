import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import Wordmark from "@/components/Wordmark";
import Icon, { type IconName } from "@/components/Icon";
import PreloadPiano from "@/features/sound/keyboard/PreloadPiano";
import SoundWheel from "@/components/landing/SoundWheel";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { FAMILIES, modeSteps, spell } from "@/features/theory/theory";

export const metadata: Metadata = {
  title: "Music Kit: See what you hear",
  description: "Music Kit draws sound as colours and shapes you can touch, so you understand why music sounds happy, sad or dreamy, and then play it on the guitar. Free in your browser.",
};

const DISPLAY: CSSProperties = { fontFamily: "var(--font-display), serif", fontVariationSettings: '"SOFT" 100, "opsz" 96' };
const MAJOR = modeSteps(FAMILIES[0], 0);
const MINOR = modeSteps(FAMILIES[0], 5);

/** A small still of the sound wheel with one or more scale shapes drawn on it. */
function MiniWheel({ shapes }: { shapes: { steps: number[]; colour: string }[] }) {
  const at = (s: number, r = 62) => {
    const a = ((s * 30 - 90) * Math.PI) / 180;
    return [80 + r * Math.cos(a), 80 + r * Math.sin(a)];
  };
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40" aria-hidden>
      <circle cx={80} cy={80} r={62} fill="none" stroke="var(--color-slate-700)" strokeDasharray="2 5" />
      {Array.from({ length: 12 }, (_, k) => <circle key={k} cx={at(k)[0]} cy={at(k)[1]} r={2} fill="var(--color-slate-700)" />)}
      {shapes.map((sh) => (
        <g key={sh.colour}>
          <polygon points={sh.steps.map((s) => at(s).join(",")).join(" ")} fill={sh.colour} fillOpacity={0.14} stroke={sh.colour} strokeWidth={2} strokeLinejoin="round" />
          {sh.steps.map((s) => <circle key={s} cx={at(s)[0]} cy={at(s)[1]} r={5} fill={sh.colour} />)}
        </g>
      ))}
    </svg>
  );
}

/** C major on frets 0–5 of a guitar, each note in its wheel colour. */
function NeckStrip() {
  const open = [64, 59, 55, 50, 45, 40];
  const names = spell(0, 0, MAJOR);
  const fx = (f: number) => (f === 0 ? 12 : 24 + (f - 0.5) * 44);
  return (
    <svg viewBox="0 0 250 132" className="w-full max-w-[16rem]" aria-hidden>
      <rect x={24} y={6} width={220} height={120} rx={5} fill="var(--color-slate-900)" />
      {[1, 2, 3, 4, 5].map((f) => <line key={f} x1={24 + f * 44} x2={24 + f * 44} y1={6} y2={126} stroke="var(--color-slate-700)" strokeWidth={2} />)}
      <rect x={22} y={6} width={4} height={120} fill="var(--color-slate-400)" />
      {open.map((_, s) => <line key={s} x1={4} x2={244} y1={16 + s * 20} y2={16 + s * 20} stroke="var(--color-slate-500)" strokeOpacity={0.7} strokeWidth={0.8 + s * 0.3} />)}
      {open.flatMap((o, s) =>
        Array.from({ length: 6 }, (_, f) => {
          const d = MAJOR.indexOf((o + f) % 12);
          if (d < 0) return [];
          return [
            <g key={`${s}-${f}`}>
              <circle cx={fx(f)} cy={16 + s * 20} r={8.5} fill={degreeColour(d)} stroke={d === 0 ? "var(--color-slate-50)" : "none"} strokeWidth={1.8} />
              <text x={fx(f)} y={16.5 + s * 20} fontSize={9} fontWeight={700} fill={DOT_INK} textAnchor="middle" dominantBaseline="central">{names[d]}</text>
            </g>,
          ];
        }),
      )}
    </svg>
  );
}

function Idea({ n, title, text, children }: { n: string; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex h-44 items-center justify-center">{children}</div>
      <div>
        <p className="text-xs tabular-nums text-slate-500">{n}</p>
        <h3 className="mt-1 text-2xl text-slate-50" style={DISPLAY}>{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
      </div>
    </li>
  );
}

const DO: { href: string; verb: string; label: string; text: string; icon: IconName; tone: string }[] = [
  { href: "/theory/drone", verb: "Hear", label: "Drone", text: "Hold one note and hear every mood against it.", icon: "audio-lines", tone: "bg-violet-500/15 text-violet-300" },
  { href: "/theory/scales", verb: "See", label: "Scales and moods", text: "Every scale on the guitar, in its colours.", icon: "sliders-horizontal", tone: "bg-amber-500/15 text-amber-300" },
  { href: "/looper", verb: "Play", label: "Looper", text: "Loop a groove and play over it.", icon: "repeat", tone: "bg-teal-500/15 text-teal-300" },
];

export default function Home() {
  return (
    <div className="app-bg min-h-screen overflow-hidden text-slate-200">
      <PreloadPiano />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800/70 py-2.5 sm:py-4">
          <SiteNav active="/" />
        </div>

        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div className="landing-rise flex flex-col items-start">
            <h1 className="text-5xl leading-none tracking-tight text-slate-50 sm:text-7xl" style={DISPLAY}>
              See what
              <span className="block italic text-sky-300">you hear.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Music is a handful of notes and the feelings between them. Music Kit draws them as colours and shapes you can touch, so you understand why a song sounds happy, sad or dreamy, and then play it yourself.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/theory/scales" className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">
                Start exploring, it&apos;s free <Icon name="chevron-right" size={16} />
              </Link>
              <a href="#course" className="text-sm text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">Get early access to the course</a>
            </div>
          </div>
          <div className="landing-rise" style={{ animationDelay: "120ms" }}>
            <SoundWheel />
          </div>
        </section>

        <section aria-labelledby="ideas" className="border-t border-slate-800/70 py-14 sm:py-20">
          <h2 id="ideas" className="mx-auto max-w-2xl text-center text-3xl leading-tight text-slate-50 text-balance sm:text-5xl" style={DISPLAY}>
            Three ideas, and music <span className="italic text-sky-300">starts to make sense.</span>
          </h2>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            <Idea n="01" title="A scale is a shape" text="Bright and sad share most of their shape. Lower three notes a notch and happy turns heartfelt. You can see it before you can name it.">
              <MiniWheel shapes={[{ steps: MAJOR, colour: "var(--color-amber-400)" }, { steps: MINOR, colour: "var(--color-violet-400)" }]} />
            </Idea>
            <Idea n="02" title="Every note has a colour" text="The home note is always white, the mood note always yellow. Learn what a note does, and you'll find it in any song, in any key.">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  {MAJOR.map((_, d) => (
                    <span key={d} className={`rounded-full ${d === 0 || d === 2 || d === 6 ? "h-9 w-9" : "mt-1.5 h-6 w-6 opacity-50"}`} style={{ background: degreeColour(d), boxShadow: d === 0 ? "0 0 0 2px var(--color-slate-50)" : undefined }} />
                  ))}
                </div>
                <div className="flex gap-5 text-xs text-slate-400">
                  <span><b className="text-slate-100">Home</b> where it rests</span>
                  <span><b style={{ color: degreeColour(2) }}>Mood</b> happy or sad</span>
                  <span><b style={{ color: degreeColour(6) }}>Pull</b> leans home</span>
                </div>
              </div>
            </Idea>
            <Idea n="03" title="The colours follow you" text="The same colours light up the guitar neck, so the sound you liked on the wheel is right there under your fingers.">
              <NeckStrip />
            </Idea>
          </ul>
        </section>

        <section aria-label="Try it" className="pb-14 sm:pb-20">
          <ul className="grid gap-3 md:grid-cols-3">
            {DO.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="group flex h-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:-translate-y-0.5 hover:border-slate-600">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${d.tone}`}><Icon name={d.icon} size={22} /></span>
                  <span className="min-w-0">
                    <span className="block text-xl text-slate-50" style={DISPLAY}><span className="italic">{d.verb}</span> · {d.label}</span>
                    <span className="text-sm text-slate-400">{d.text}</span>
                  </span>
                  <span aria-hidden className="ml-auto text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="course" aria-labelledby="course-h" className="scroll-mt-6 pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-4xl border border-slate-700/60 bg-slate-900/70 p-6 sm:p-10">
            <div aria-hidden className="wheel-halo pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: `conic-gradient(${[0, 1, 2, 3, 4, 5, 6, 0].map(degreeColour).join(",")})` }} />
            <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">Early access</p>
                <h2 id="course-h" className="text-3xl leading-tight text-slate-50 sm:text-4xl" style={DISPLAY}>Learn it, step by step.</h2>
                <p className="mt-3 max-w-md text-slate-400">A short video course that walks you through the guitar with these colours. Join early and every style course that follows, from surf rock to funk, is yours free.</p>
              </div>
              <EarlyAccessForm source="home" compact />
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-800/70 py-8 text-xs text-slate-500 sm:flex-row">
          <Wordmark className="text-xl" />
          <p>Made for people who&apos;d rather play.</p>
        </footer>
      </div>
    </div>
  );
}
