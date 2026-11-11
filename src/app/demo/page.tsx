import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon, { type IconName } from "@/components/Icon";
import { BetaBadge, DISPLAY } from "@/components/landing/Display";
import { demoCards, type DemoCard } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/studio";

export const metadata: Metadata = {
  title: "Demos: ready-made AI practice plans and teacher notes · attunr",
  description: "Ready-made weeks of daily exercises, written by an AI and played in attunr, and notes a teacher made ahead.",
  alternates: { canonical: "/plan" },
  robots: { index: false },
};

/** The groups the plans sit in, each with its icon and colour. Class names are written out whole so Tailwind keeps them. */
const AREAS: { area: DemoCard["area"]; name: string; icon: IconName; tile: string }[] = [
  { area: "guitar", name: "Guitar", icon: "guitar", tile: "bg-amber-500/15 text-amber-300" },
  { area: "voice", name: "Voice", icon: "mic", tile: "bg-violet-500/15 text-violet-300" },
];

/** One colour per level, so the cards read easiest to hardest at a glance. */
const LEVEL: Record<DemoCard["level"], { name: string; chip: string; day: string }> = {
  new: { name: "New", chip: "border-sky-400/40 text-sky-300", day: "bg-sky-400/50" },
  beginner: { name: "Beginner", chip: "border-emerald-400/40 text-emerald-300", day: "bg-emerald-400/50" },
  intermediate: { name: "Intermediate", chip: "border-amber-400/40 text-amber-300", day: "bg-amber-400/50" },
  advanced: { name: "Advanced", chip: "border-rose-400/40 text-rose-300", day: "bg-rose-400/50" },
};

const CARD = "group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-slate-100 transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900/80";

function SectionHead({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-2xl text-slate-50 sm:text-3xl" style={DISPLAY}>{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function OpenLink({ children }: { children: string }) {
  return (
    <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-sky-300 transition group-hover:gap-2">
      {children} <Icon name="chevron-right" size={14} />
    </span>
  );
}

function PlanCard({ demo }: { demo: DemoCard }) {
  const level = LEVEL[demo.level];
  return (
    <Link href={`/demo/${demo.slug}`} className={CARD} aria-label={`${demo.label}: ${demo.title}`}>
      <div className="flex items-center gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 font-medium ${level.chip}`}>{level.name}</span>
        <span className="flex items-center gap-1 text-slate-400"><Icon name="timer" size={13} /> {demo.minutes} min a day</span>
      </div>
      <h3 className="mt-4 text-xl leading-snug text-slate-50 text-balance" style={DISPLAY}>{demo.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{demo.summary}</p>
      <div className="mt-auto pt-5">
        {/* the week, one bar a day, each with its theme on hover */}
        <ol className="flex gap-1" aria-label="7 days">
          {demo.themes.map((theme, i) => (
            <li key={i} title={`Day ${i + 1}: ${theme}`} className={`h-1.5 flex-1 rounded-full ${i === 0 ? level.day : "bg-slate-700/70"}`} />
          ))}
        </ol>
        <p className="mt-2 truncate text-xs text-slate-500"><span className="text-slate-300">Day 1</span> · {demo.themes[0]}</p>
        <OpenLink>Open the week</OpenLink>
      </div>
    </Link>
  );
}

/** What an AI plan is written from: the student's answers and the teacher's guidance, in, a week of exercises out. */
const SOURCES: { icon: IconName; title: string; text: string; tile: string }[] = [
  { icon: "graduation-cap", title: "From the student", text: "What they play, their level and the minutes they have", tile: "bg-emerald-500/15 text-emerald-300" },
  { icon: "pencil", title: "From the teacher", text: "What to work on, in their own words", tile: "bg-amber-500/15 text-amber-300" },
  { icon: "sparkles", title: "The AI writes the week", text: "Seven days of exercises, each with its neck, staff or band", tile: "bg-sky-500/15 text-sky-300" },
];

function PlanSources() {
  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
        Every practice plan is written by an AI from what the student tells it and what their teacher asks for. A teacher gets a week of interactive exercises by describing the student, not by building each exercise.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {SOURCES.map((s, i) => (
          <li key={s.title} className="relative flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.tile}`}><Icon name={s.icon} size={16} /></span>
            <span className="text-sm">
              <span className="block font-medium text-slate-100">{s.title}</span>
              <span className="text-slate-400">{s.text}</span>
            </span>
            {i < SOURCES.length - 1 && <Icon name="chevron-right" size={16} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-600 sm:block" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The three steps of the autoplan, drawn beside its pitch. */
const AUTOPLAN_STEPS: { icon: IconName; text: string }[] = [
  { icon: "list", text: "Answer a few questions: what you play, your level and the minutes you have." },
  { icon: "puzzle", text: "Your AI extension reads the prompt on the page and sends your plan back." },
  { icon: "play", text: "A new day of exercises opens each day, and each week builds on the last." },
];

function Autoplan() {
  return (
    <section aria-labelledby="autoplan-h" className="relative overflow-hidden rounded-3xl border border-sky-400/25 bg-linear-to-br from-sky-500/10 via-slate-900/60 to-violet-500/10 p-6 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <div>
          <p className="flex items-center text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
            <Icon name="sparkles" size={14} className="mr-2" /> AI autoplan<BetaBadge />
          </p>
          <h2 id="autoplan-h" className="mt-3 text-3xl leading-tight text-slate-50 text-balance sm:text-4xl" style={DISPLAY}>A week like these, written for you</h2>
          <p className="mt-4 max-w-lg text-slate-300">
            attunr writes the prompt from your answers. An AI extension in your browser, such as Claude in Chrome or Gemini in Chrome, reads it and writes your plan straight into attunr.
          </p>
          <p className="mt-4 flex max-w-lg gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm text-slate-400">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-sky-300" />
            <span>The autoplan is in beta and works best with an AI extension. Without one, copy the prompt into any AI chat and paste the reply back.</span>
          </p>
          <Link href="/plan" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
            <Icon name="sparkles" size={16} /> Try the AI autoplan
          </Link>
        </div>
        <ol className="flex flex-col gap-3">
          {AUTOPLAN_STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300"><Icon name={s.icon} size={18} /></span>
              <span className="text-sm leading-relaxed text-slate-300"><span className="mr-1.5 font-semibold text-slate-100">{i + 1}.</span>{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** How a teacher makes a note like the ones beside it: the Notes creator, by hand or with an AI extension. */
const NOTE_WAYS: { icon: IconName; title: string; text: string }[] = [
  { icon: "plus", title: "Add a widget", text: "A neck, chords, a staff, a melody to sing or a band goes on the page in a click, already in the note's key." },
  { icon: "puzzle", title: "With an AI extension", text: "Describe the lesson, and the AI extension writes the note for you to check and change." },
  { icon: "share-2", title: "Share as a note", text: "The student gets a link, and every widget on it plays." },
];

function NotesCreator() {
  return (
    <div className="flex flex-col rounded-2xl border border-teal-400/20 bg-linear-to-br from-teal-500/10 via-slate-900/50 to-slate-900/50 p-5 sm:p-6 lg:col-span-2">
      <h3 className="text-xl text-slate-50" style={DISPLAY}>Make a note like this one</h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
        Notes are made in the Notes creator, by hand or with an AI extension to help. Every widget is easy to add on screen, so the lesson is a page to play, not a page to read.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {NOTE_WAYS.map((w) => (
          <li key={w.title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300"><Icon name={w.icon} size={16} /></span>
            <span className="mt-2 block text-sm font-medium text-slate-100">{w.title}</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-slate-400">{w.text}</span>
          </li>
        ))}
      </ul>
      <Link href="/teachers/studio?notes=1" className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40">
        <Icon name="file-text" size={16} /> Open the Notes creator
      </Link>
    </div>
  );
}

/** Every demo in one list (the plans at /demo/<slug>, the teacher notes at /note/<slug>), so a pitch can link to /demo. */
export default function DemoIndex() {
  const cards = demoCards();
  return (
    <PageShell active="/plan" title="Demos" intro="Ready-made weeks of practice and a note a teacher made. Open one and try it. Nothing here is saved.">
      <div className="flex flex-col gap-14 pb-10">
        <section aria-labelledby="plans-h">
          <SectionHead id="plans-h" title="Practice plans" text="A week of daily exercises each, as the AI wrote it. Open any day and play with its tools." />
          <PlanSources />
          <div className="flex flex-col gap-8">
            {AREAS.map(({ area, name, icon, tile }) => {
              const group = cards.filter((c) => c.area === area);
              if (!group.length) return null;
              return (
                <div key={area}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile}`}><Icon name={icon} size={15} /></span>
                    {name}
                  </h3>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((demo) => <li key={demo.slug}><PlanCard demo={demo} /></li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <Autoplan />

        <section aria-labelledby="notes-h">
          <SectionHead id="notes-h" title="Teacher notes" text="A lesson on one page, the way a teacher sends it to a student." />
          <div className="grid gap-4 lg:grid-cols-3">
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
            {Object.entries(PRESET_INFO).map(([slug, note]) => (
              <li key={slug}>
                <Link href={`/note/${slug}`} className={CARD}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300"><Icon name="file-text" size={18} /></span>
                  <h3 className="mt-4 text-xl leading-snug text-slate-50 text-balance" style={DISPLAY}>{note.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{note.description}</p>
                  <div className="mt-auto"><OpenLink>Open the note</OpenLink></div>
                </Link>
              </li>
            ))}
          </ul>
          <NotesCreator />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
