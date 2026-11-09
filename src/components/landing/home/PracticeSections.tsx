import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { DISPLAY, Eyebrow, H2, Mark } from "@/components/landing/Display";
import ScaleWheel from "@/components/theory/ScaleWheel";
import { degreeColour, degreeLabels } from "@/features/theory/scales";
import { THEORY_SECTIONS, TONE } from "@/features/theory/sections";
import { FAMILIES, MAJOR, modeSteps } from "@/features/theory/theory";

/*
 * The practice core both home pages share (the player page at /players and the music-school page at /): the skills the
 * drills build, the AI practice plan and the colour ideas. Each section takes its own heading so a page can pitch it its way.
 */

export function Check({ children, tone = "text-emerald-400" }: { children: ReactNode; tone?: string }) {
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

/** What practice in attunr trains: each skill and the drills that train it. `sing` marks a drill for the voice. */
const SKILLS: { icon: IconName; title: string; text: ReactNode; tone: string; drills: { href: string; label: string; sing?: boolean }[] }[] = [
  {
    icon: "repeat", title: "Build muscle memory", tone: "bg-teal-500/15 text-teal-300",
    text: <>Repeat a pattern until your fingers or your voice do it without thinking, then change the key, the shape or the rhythm and you have <Mark tone="var(--color-teal-400)">a drill of your own</Mark>.</>,
    drills: [{ href: "/theory/scales", label: "Scale drills" }, { href: "/theory/singing", label: "Sing a scale", sing: true }, { href: "/theory/singing/runs", label: "Sing runs", sing: true }],
  },
  {
    icon: "ear", title: "Hear it, sing it in tune", tone: "bg-sky-500/15 text-sky-300",
    text: <>Name an interval the moment you hear it and sing it back, until <Mark>your own ear</Mark> tells you when you&apos;re in tune.</>,
    drills: [{ href: "/theory/ears", label: "Ear training" }, { href: "/theory/singing/intervals", label: "Sing an interval", sing: true }, { href: "/theory/singing/melodies", label: "Sing melodies", sing: true }],
  },
  {
    icon: "metronome", title: "Lock in your rhythm", tone: "bg-violet-500/15 text-violet-300",
    text: <>Hit the beat, not just the note. Play against a metronome or drone until <Mark tone="var(--color-violet-400)">you feel the pulse</Mark> without one.</>,
    drills: [{ href: "/theory/rhythm", label: "Rhythm drills" }, { href: "/theory/improv", label: "Play over a groove" }],
  },
  {
    icon: "guitar", title: "Know the fretboard", tone: "bg-amber-500/15 text-amber-300",
    text: <>Find any note in a second. Learn the neck by name, colour and the job each note does, until it&apos;s <Mark tone="var(--color-amber-400)">a map you can read</Mark>.</>,
    drills: [{ href: "/theory/notes", label: "Fretboard notes" }, { href: "/theory/arpeggios", label: "Arpeggios" }, { href: "/theory/tune-by-ear", label: "Tune by ear", sing: true }],
  },
];

/** A day of the AI practice plan, drawn for the landing page: what the player sees when they open today's practice. */
const PLAN_DAY: { label: string; mins: number; tone: string; done?: boolean }[] = [
  { label: "A minor pentatonic, positions 1–2", mins: 10, tone: "bg-teal-400", done: true },
  { label: "Intervals by ear: 3rds and 5ths", mins: 5, tone: "bg-sky-400", done: true },
  { label: "Sing the scale over a drone", mins: 5, tone: "bg-rose-400" },
  { label: "Eighth notes at 80 bpm, on the beat", mins: 5, tone: "bg-violet-400" },
];

/**
 * The tools the landing page opens straight into, split by what you open them for, so none shows twice. The drills sit on the
 * skill cards above. Label, line, icon and colour come from the nav list.
 */
export type ToolGroup = { label: string; hrefs: string[] };
export const SEE_TOOLS: ToolGroup = { label: "See it on the neck", hrefs: ["/theory/scales", "/theory/chords", "/theory/caged", "/theory/triads"] };
export const PLAY_TOOLS: ToolGroup = { label: "Play along", hrefs: ["/theory/metronome-drone", "/theory/backing", "/looper"] };
const toolsOf = (g: ToolGroup) => g.hrefs.flatMap((href) => THEORY_SECTIONS.filter((s) => s.href === href));

export function SkillsSection({
  eyebrow = "Drills for every part of playing",
  title = <>Develop your own <span className="ls-accent italic text-sky-300">guitar senses.</span></>,
  intro = <>Not a screen that tells you when you got it right. Drills for your hands, ears, voice and timing that you repeat until <Mark>you can feel it yourself</Mark>, and understand well enough to <Mark>invent your own</Mark>.</>,
}: { eyebrow?: ReactNode; title?: ReactNode; intro?: ReactNode }) {
  return (
    <section aria-labelledby="skills-h" className="border-t border-slate-800/70 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H2 id="skills-h">{title}</H2>
        <p className="mt-4 text-pretty text-slate-300">{intro}</p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {SKILLS.map((s) => (
          <li key={s.title} className="ls-card flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tone}`}><Icon name={s.icon} size={20} /></span>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>{s.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{s.text}</p>
            <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
              <span className="text-slate-500">Try it:</span>
              {s.drills.map((d) => (
                <Link key={d.href} href={d.href} className="inline-flex items-center gap-1 text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-50">
                  {d.sing && <Icon name="mic" size={14} className="shrink-0 text-rose-300" />}{d.label}
                </Link>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Today's practice from the AI plan, as the player sees it. */
export function PlanDayCard() {
  return (
    <div className="ls-card rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6" aria-hidden>
      <div className="flex items-baseline justify-between">
        <p className="text-xl text-slate-50" style={DISPLAY}>Today · day 3</p>
        <p className="text-xs text-slate-500">25 min</p>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {PLAN_DAY.map((x) => (
          <li key={x.label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${x.done ? `${x.tone} text-slate-950` : "border border-slate-600"}`}>{x.done && <Icon name="check" size={14} />}</span>
            <span className={`h-8 w-1 shrink-0 rounded-full ${x.tone}`} />
            <span className={`flex-1 text-sm ${x.done ? "text-slate-500 line-through" : "text-slate-200"}`}>{x.label}</span>
            <span className="text-xs text-slate-500">{x.mins} min</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 h-2 rounded-full bg-slate-800"><div className="h-2 w-1/2 rounded-full bg-linear-to-r from-teal-400 to-sky-400" /></div>
    </div>
  );
}

export function PlanSection() {
  return (
    <section id="plan" aria-labelledby="plan-h" className="scroll-mt-6 border-t border-slate-800/70 py-12 sm:py-16">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Eyebrow>AI practice plan</Eyebrow>
          <H2 id="plan-h">Never wonder <span className="ls-accent italic text-sky-300">what to practise.</span></H2>
          <p className="mt-4 max-w-lg text-slate-300">
            Tell attunr what you play, how much time you have and where you want to go. Your AI builds a plan from attunr&apos;s drills, and <Mark>every day a new set of exercises</Mark> is waiting for you.
          </p>
          <ul className="mt-6 flex flex-col gap-4">
            {[
              { icon: "sparkles" as const, t: "New ideas every day", s: "A fresh mix of drills each day, and the idea behind each, so you learn to build your own.", c: "bg-sky-500/15 text-sky-300" },
              { icon: "layers" as const, t: "Each week builds on the last", s: "Next week's plan knows what you practised this week and picks up from there.", c: "bg-teal-500/15 text-teal-300" },
              { icon: "bell" as const, t: "A nudge when it's time", s: "Set a daily reminder so practice becomes a habit.", c: "bg-violet-500/15 text-violet-300" },
            ].map((x) => (
              <li key={x.t} className="flex gap-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${x.c}`}><Icon name={x.icon} size={20} /></span>
                <span><b className="block font-semibold text-slate-100">{x.t}</b><span className="text-sm text-slate-400">{x.s}</span></span>
              </li>
            ))}
          </ul>
          <Link href="/plan" className="ls-btn ls-btn-primary ls-glint mt-8 inline-flex items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
            Build my plan <Icon name="chevron-right" size={16} />
          </Link>
          <p className="mt-3 text-xs text-slate-500">Works with the AI you already use: attunr gives you the prompt, you paste back the reply.</p>
        </div>
        <PlanDayCard />
      </div>
    </section>
  );
}

export function IdeasSection({ eyebrow = "Free in the app", title = <>Practice that <span className="ls-accent italic text-sky-300">adds up.</span></>, tools = [SEE_TOOLS, PLAY_TOOLS] }: { eyebrow?: ReactNode; title?: ReactNode; tools?: ToolGroup[] }) {
  const dorian = modeSteps(FAMILIES[0], 1);
  return (
    <section aria-labelledby="ideas-h" className="border-t border-slate-800/70 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H2 id="ideas-h">{title}</H2>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
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
          <p className="text-sm leading-relaxed text-slate-400">The home note is always white, the mood note always yellow. Learn what a note does and you&apos;ll find it <Mark tone="var(--color-amber-400)">in any song, in any key</Mark>.</p>
        </li>
        <li className="ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex h-56 items-center justify-center"><ProgressPath /></div>
          <h3 className="text-2xl text-slate-50" style={DISPLAY}>Always know what&apos;s next</h3>
          <p className="text-sm leading-relaxed text-slate-400">Practise in an order that builds, one step at a time, so you never wonder whether today&apos;s practice was the right practice.</p>
        </li>
      </ul>
      <h3 className="mt-14 text-center text-2xl text-slate-50 sm:text-3xl" style={DISPLAY}>Open a tool and <span className="ls-accent italic text-sky-300">start playing.</span></h3>
      {tools.map((g) => (
        <div key={g.label} className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">{g.label}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {toolsOf(g).map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="ls-card group flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:-translate-y-0.5 hover:border-slate-600">
                  <span className="flex items-center justify-between">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE[d.tone].chip} ${TONE[d.tone].icon}`}><Icon name={d.icon} size={20} /></span>
                    <span aria-hidden className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300">→</span>
                  </span>
                  <span className="text-lg leading-tight text-slate-50" style={DISPLAY}>{d.label}</span>
                  <span className="text-sm leading-snug text-slate-400">{d.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
