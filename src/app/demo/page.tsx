import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon, { type IconName } from "@/components/Icon";
import { BetaBadge, DISPLAY } from "@/components/landing/Display";
import { demoCards, type DemoCard } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/studio";
import ContactForm from "@/components/landing/ContactForm";
import Founder from "@/components/landing/Founder";
import GlassShapes from "@/components/landing/GlassShapes";

export const metadata: Metadata = {
  title: "Demos: ready-made AI practice plans and teacher notes · attunr",
  description: "Try a week of daily practice written by the AI autoplan, and a lesson note a student can play. No account needed.",
  alternates: { canonical: "/plan" },
  robots: { index: false },
};

/** The groups the plans sit in, each with its icon and colour. Class names are written out whole so Tailwind keeps them. */
const AREAS: { area: DemoCard["area"]; name: string; icon: IconName; tile: string; card: string }[] = [
  { area: "guitar", name: "Guitar", icon: "guitar", tile: "bg-amber-500/15 text-amber-300", card: "border-t-amber-400/60 hover:border-amber-400/50" },
  { area: "voice", name: "Voice", icon: "mic", tile: "bg-violet-500/15 text-violet-300", card: "border-t-violet-400/60 hover:border-violet-400/50" },
];

/** One colour per level, so the cards read easiest to hardest at a glance. */
const LEVEL: Record<DemoCard["level"], { name: string; chip: string; day: string }> = {
  new: { name: "New", chip: "border-sky-400/40 text-sky-300", day: "bg-sky-400/50" },
  beginner: { name: "Beginner", chip: "border-emerald-400/40 text-emerald-300", day: "bg-emerald-400/50" },
  intermediate: { name: "Intermediate", chip: "border-amber-400/40 text-amber-300", day: "bg-amber-400/50" },
  advanced: { name: "Advanced", chip: "border-rose-400/40 text-rose-300", day: "bg-rose-400/50" },
};

/** A card on a coloured panel: dark glass, a coloured top edge (`accent` gives its colour and hover border). */
const CARD = "group flex h-full flex-col rounded-2xl border border-t-2 border-white/10 bg-slate-950/55 p-5 text-slate-100 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-slate-950/75";

/** A panel's head: its tool's badge, as on the tool below, then the title and its line. */
function PanelHead({ id, badge, icon, tone, title, text }: { id: string; badge: string; icon: IconName; tone: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${tone}`}>
        <Icon name={icon} size={13} /> {badge}
      </p>
      <h2 id={id} className="mt-4 text-3xl leading-tight text-slate-50 text-balance" style={DISPLAY}>{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300/80">{text}</p>
    </div>
  );
}

/** A column's label over its cards: a coloured tile and a name. */
function ColumnHead({ icon, tile, name }: { icon: IconName; tile: string; name: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile}`}><Icon name={icon} size={15} /></span>
      {name}
    </h3>
  );
}

function OpenLink({ children }: { children: string }) {
  return (
    <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-sky-300 transition group-hover:gap-2">
      {children} <Icon name="chevron-right" size={14} />
    </span>
  );
}

function PlanCard({ demo, accent }: { demo: DemoCard; accent: string }) {
  const level = LEVEL[demo.level];
  return (
    <Link href={`/demo/${demo.slug}`} className={`${CARD} ${accent}`} aria-label={`${demo.label}: ${demo.title}`}>
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

/** The three steps of the autoplan, drawn beside its pitch. */
const AUTOPLAN_STEPS: { icon: IconName; text: string }[] = [
  { icon: "list", text: "Answer a few questions: what you play, your level and the minutes you have." },
  { icon: "puzzle", text: "Your AI extension reads the prompt on the page and sends your plan back." },
  { icon: "play", text: "A new day of exercises opens each day, and each week builds on the last." },
];

/**
 * An example panel: on wide screens it spans the two shared rows (head, cards) as a subgrid. Every section on the page is frosted
 * (backdrop-blur), so a glass shape sliding behind one shows blurred under it, never sharp through it.
 */
const PANEL = "rounded-3xl border backdrop-blur-xl p-5 sm:p-7 lg:row-span-2 lg:grid lg:grid-rows-subgrid";

const TOOL = "flex flex-col rounded-3xl border backdrop-blur-xl p-6 sm:p-8";
const STEP_TILE = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";

function Autoplan() {
  return (
    <section aria-labelledby="autoplan-h" className={`${TOOL} border-sky-400/25 bg-linear-to-br from-sky-500/10 via-slate-900/60 to-violet-500/10`}>
      <p className="flex items-center text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
        <Icon name="sparkles" size={14} className="mr-2" /> AI autoplan<BetaBadge />
      </p>
      <h2 id="autoplan-h" className="mt-3 text-3xl leading-tight text-slate-50 text-balance" style={DISPLAY}>A week of practice, written for one student</h2>
      <ol className="mb-7 mt-6 flex flex-col gap-3">
        {AUTOPLAN_STEPS.map((s) => (
          <li key={s.text} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
            <span className={`${STEP_TILE} bg-sky-500/15 text-sky-300`}><Icon name={s.icon} size={16} /></span>
            <span className="pt-1">{s.text}</span>
          </li>
        ))}
      </ol>
      <Link href="/plan" className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
        <Icon name="sparkles" size={16} /> Try the AI autoplan
      </Link>
    </section>
  );
}

/** How a teacher makes a note in the Notes creator. AI drafting of notes is not built yet, so it says "soon". */
const NOTE_WAYS: { icon: IconName; text: string; soon?: boolean }[] = [
  { icon: "plus", text: "Add a neck, chords, a staff, a melody to sing or a band in a click, already in the note's key." },
  { icon: "share-2", text: "Send it to the student as a link. Every widget on it plays." },
  { icon: "sparkles", text: "Describe the lesson and let AI draft the note for you.", soon: true },
];

function NotesCreator() {
  return (
    <section aria-labelledby="creator-h" className={`${TOOL} border-teal-400/25 bg-linear-to-br from-teal-500/10 via-slate-900/60 to-slate-900/50`}>
      <p className="flex items-center text-xs font-medium uppercase tracking-[0.2em] text-teal-300">
        <Icon name="file-text" size={14} className="mr-2" /> Notes creator<BetaBadge />
      </p>
      <h2 id="creator-h" className="mt-3 text-3xl leading-tight text-slate-50 text-balance" style={DISPLAY}>A lesson on one page the student can play</h2>
      <ul className="mb-7 mt-6 flex flex-col gap-3">
        {NOTE_WAYS.map((w) => (
          <li key={w.text} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
            <span className={`${STEP_TILE} bg-teal-500/15 text-teal-300`}><Icon name={w.icon} size={16} /></span>
            <span className="pt-1">
              {w.text}
              {w.soon && <span className="ml-2 inline-flex rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-sky-300">Soon</span>}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/teachers/studio?notes=1" className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300">
        <Icon name="pencil" size={16} /> Open the Notes creator
      </Link>
    </section>
  );
}

/** Who made the demos, and a form to write to the founder. */
function Maker() {
  return (
    <section aria-labelledby="maker-h" className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
      <Founder id="maker-h" title="Questions about a demo? Write to me." text={<>I build attunr. If an example doesn&apos;t play right, or you&apos;d like one for what you teach, tell me here.</>}>
        <ContactForm source="demo" initialMessage={"Hi Pio, I tried the demos. "} cta="Send message" done="I'll reply by email." note="I only use your email to reply. No newsletter." />
      </Founder>
    </section>
  );
}

/** Where attunr could go, one direction to a card. Only the practice plans and the notes are built; the rest is the vision. */
const DIRECTIONS: { icon: IconName; title: string }[] = [
  { icon: "target", title: "Every student practises the right thing" },
  { icon: "activity", title: "Teachers see the week between lessons" },
  { icon: "pencil", title: "Material in your own teaching style" },
  { icon: "video", title: "Interactive tools for teaching over the internet" },
  { icon: "layout-dashboard", title: "A studio run from one place" },
  { icon: "graduation-cap", title: "Your notes sold as short courses" },
];

/**
 * Where attunr is heading, below the demos and tools, from the facts in the founder's outreach (FACTS in features/devtools/model/kickstarter).
 * It speaks of directions, not features, and says plainly that only the demos below work today.
 */
function Vision() {
  return (
    <section aria-labelledby="vision-h" className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">The vision</p>
      <h2 id="vision-h" className="mt-3 max-w-2xl text-3xl leading-tight text-slate-50 text-balance sm:text-4xl" style={DISPLAY}>Where attunr is going</h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
        Today: practice plans and lesson notes. Next, the place a teacher plans practice, sees how it went and runs their teaching.
      </p>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTIONS.map((d) => (
          <li key={d.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <span className={`${STEP_TILE} bg-sky-500/15 text-sky-300`}><Icon name={d.icon} size={16} /></span>
            <h3 className="mt-3 text-base font-semibold text-slate-100">{d.title}</h3>
          </li>
        ))}
        <li className="flex flex-col justify-center rounded-2xl border border-dashed border-sky-400/30 bg-sky-400/5 p-4">
          <p className="text-sm leading-relaxed text-slate-300">
            <b className="font-semibold text-slate-100">Music teaching needs a human.</b> AI only makes the work easier.
          </p>
        </li>
      </ul>
      <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
        <span>What comes next is decided with the first studios.</span>
        <Link href="/kickstarter" className="inline-flex items-center gap-1 font-medium text-sky-300 transition hover:gap-2 hover:text-sky-200">
          Become a founding partner <Icon name="chevron-right" size={14} />
        </Link>
      </p>
    </section>
  );
}

/** A ruled line with a label in the middle, between the examples and the tools that made them. */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-sky-400/70 to-violet-400/80" />
      <span className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
        <Icon name="sparkles" size={13} className="text-sky-300" /> <span className="underline decoration-sky-400/70 underline-offset-4">{label}</span>
      </span>
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-teal-400/70 to-violet-400/80" />
    </div>
  );
}

/**
 * What the tools make on top, side by side: the plans at /demo/<slug> (guitar and voice in two columns) and the teacher notes at
 * /note/<slug>; then the two tools, so a pitch can link to /demo.
 */
export default function DemoIndex() {
  const cards = demoCards();
  return (
    <PageShell active="/plan" eyebrow="Demos" title="Practice that sounds like your lessons" intro="Hi, I'm Pio. I'm building attunr to make teaching easier for teachers and practice better for students. It's in demo mode, so try anything below. No account needed." decor={<GlassShapes />}>
      <div className="flex flex-col gap-12 pb-10">
        {/* two panels in their tools' colours; on wide screens a shared subgrid lines up their heads, so the cards start level */}
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:grid-rows-[auto_1fr]">
          <section aria-labelledby="plans-h" className={`${PANEL} border-sky-400/30 bg-linear-to-br from-sky-500/30 via-indigo-500/15 to-violet-600/30 shadow-2xl shadow-sky-950/40`}>
            <PanelHead id="plans-h" badge="AI autoplan" icon="sparkles" tone="border-sky-400/40 bg-sky-400/10 text-sky-200" title="A week of practice, one day at a time" text="Each card is one student's week, as the AI autoplan wrote it: a few minutes of exercises a day, with the tools to play them on the page. Open a week and try any day." />
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
              {AREAS.map(({ area, name, icon, tile, card }) => {
                const group = cards.filter((c) => c.area === area);
                if (!group.length) return null;
                return (
                  <div key={area}>
                    <ColumnHead icon={icon} tile={tile} name={name} />
                    <ul className="flex flex-col gap-4">
                      {group.map((demo) => <li key={demo.slug}><PlanCard demo={demo} accent={card} /></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="notes-h" className={`${PANEL} border-teal-400/30 bg-linear-to-br from-teal-500/30 via-emerald-500/15 to-cyan-600/25 shadow-2xl shadow-teal-950/40`}>
            <PanelHead id="notes-h" badge="Notes creator" icon="file-text" tone="border-teal-400/40 bg-teal-400/10 text-teal-200" title="A lesson note that plays" text="Today's material on one page: scales, chords and exercises the student can play. It goes to the student as a link." />
            <div>
              <ColumnHead icon="file-text" tile="bg-teal-500/15 text-teal-300" name="Teacher notes" />
              <ul className="flex flex-col gap-4">
                {Object.entries(PRESET_INFO).map(([slug, note]) => (
                  <li key={slug}>
                    <Link href={`/note/${slug}`} className={`${CARD} border-t-teal-400/60 hover:border-teal-400/50`}>
                      <h3 className="text-xl leading-snug text-slate-50 text-balance" style={DISPLAY}>{note.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{note.description}</p>
                      <div className="mt-auto"><OpenLink>Open the note</OpenLink></div>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/teachers/studio?notes=1" className="group flex flex-col rounded-2xl border border-dashed border-teal-400/40 bg-teal-400/5 p-5 transition hover:border-teal-300/70 hover:bg-teal-400/10">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300"><Icon name="plus" size={18} /></span>
                    <h3 className="mt-4 text-xl leading-snug text-slate-50" style={DISPLAY}>Write your own note</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">Start from an empty page in the Notes creator.</p>
                    <OpenLink>Open the Notes creator</OpenLink>
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <Divider label="Made with two simple tools" />

        <div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Autoplan />
            <NotesCreator />
          </div>
          <p className="mt-4 flex gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm text-slate-400 backdrop-blur-xl">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-sky-300" />
            <span><b className="font-semibold text-slate-200">In the beta, the AI part runs on your own AI.</b> Use an AI extension in your browser, such as Claude in Chrome, or paste the prompt into any AI chat. That&apos;s how attunr stays free and open.</span>
          </p>
        </div>

        <Vision />

        <Maker />
      </div>
    </PageShell>
  );
}
