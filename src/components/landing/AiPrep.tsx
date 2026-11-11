import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { BetaBadge, DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";
import { STAR_LABELS } from "@/features/progress/stars";

/*
 * The AI section of the founding-partner page (/kickstarter), right under the hero: what a teacher does in each lesson
 * (a week of daily exercises, planned by AI, and an interactive lesson note) and how attunr measures practice. The facts are
 * the ones in FACTS (src/features/devtools/model/kickstarter.ts). AI drafting of lesson notes is not built yet, so its card
 * says "AI drafting soon"; the plan works today with the player's own AI in the browser, which the note under the cards says.
 */

const CARD = "ls-card flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 text-left sm:p-6";
const GHOST = "ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40";

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" /> {children}
    </span>
  );
}

/** A week of practice as the plan shows it: seven days, today's exercise, rated. Illustration only. */
function WeekMock() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" aria-hidden>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <span key={i} className={`grid h-8 place-items-center rounded-lg text-xs font-semibold ${i < 2 ? "bg-violet-400/20 text-violet-200" : i === 2 ? "bg-violet-400 text-slate-950 shadow-[0_0_14px_var(--color-violet-400)]" : "border border-dashed border-slate-700 text-slate-500"}`}>{d}</span>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <p className="text-base text-slate-50" style={DISPLAY}>Em to Am, clean and in time</p>
        <p className="mt-0.5 text-xs text-slate-400">Chord changes · 8 min</p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex gap-0.5 text-amber-300">{"★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}<span className="text-slate-600">★</span></span>
          <span className="text-xs text-slate-400">{STAR_LABELS[4]}</span>
        </div>
      </div>
    </div>
  );
}

/** A lesson note as the student opens it: a title and the day's material. Illustration only. */
function NoteMock() {
  return (
    <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300" aria-hidden>
      <p className="mb-1 text-base text-slate-50" style={DISPLAY}>Tuesday · A minor pentatonic</p>
      {([{ icon: "guitar", t: "Position 1 on the neck" }, { icon: "play", t: "Play along with the band" }, { icon: "mic", t: "Sing the five notes" }] as { icon: IconName; t: string }[]).map((l) => (
        <span key={l.t} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5">
          <Icon name={l.icon} size={14} className="shrink-0 text-teal-300" /> {l.t}
        </span>
      ))}
    </div>
  );
}

/** The three ways attunr measures practice. */
const MEASURES: { icon: "timer" | "repeat" | "target"; title: string; text: string }[] = [
  { icon: "timer", title: "Minutes a day", text: "How long the student practises each day." },
  { icon: "repeat", title: "Day after day", text: "How consistently they come back to it." },
  { icon: "target", title: "How it went", text: `Their own rating of each exercise, from "${STAR_LABELS[1]}" to "${STAR_LABELS[5]}".` },
];

export default function AiPrep() {
  return (
    <section id="ai" aria-labelledby="ai-h" className="scroll-mt-24 sect-rule py-12 text-center sm:py-16">
      <Eyebrow tone="text-violet-300">In every lesson<BetaBadge /></Eyebrow>
      <H2 id="ai-h">A week of practice, <span className="ls-accent italic text-violet-300">ready before the lesson ends.</span></H2>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-slate-300">
        In each lesson you do two quick things: plan the student&apos;s daily exercises for the next week, and make an interactive note with today&apos;s material. AI drafts both. The student practises with them every day at home.
      </p>

      <ul className="mt-10 grid gap-4 lg:grid-cols-2">
        <li className={CARD}>
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon name="sparkles" size={20} /></span>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>AI practice plan</h3>
            </div>
            <Badge tone="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">Works today</Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Seven days of short exercises for guitar or voice, each with something to play on the screen. Each new week builds on the last one and on how the student rated every exercise. You can steer it whenever you want.
          </p>
          <WeekMock />
          <div className="flex flex-wrap gap-2">
            <Link href="/demo/guitar-beginner" className={GHOST}><Icon name="play" size={16} /> See a week</Link>
            <Link href="/plan" className={GHOST}><Icon name="sparkles" size={16} /> Build a plan</Link>
          </div>
        </li>
        <li className={CARD}>
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-500/15 text-teal-300"><Icon name="file-text" size={20} /></span>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>Interactive lesson notes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">Notes work today</Badge>
              <Badge tone="border-sky-400/40 bg-sky-400/10 text-sky-300">AI drafting soon</Badge>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Today&apos;s scales, chords and exercises on one page, sent to the student as a link. Every diagram plays.
          </p>
          <NoteMock />
          <div className="flex flex-wrap gap-2">
            <Link href="/note/minor-pentatonic" className={GHOST}><Icon name="file-text" size={16} /> Open a lesson note</Link>
            <Link href="/teachers/studio?notes=1" className={GHOST}><Icon name="pencil" size={16} /> Open the notes creator</Link>
          </div>
        </li>
      </ul>

      {/* the honest part, right under the cards: the AI is the reader's own, in their browser */}
      <p className="mx-auto mt-6 inline-flex max-w-2xl items-start gap-2.5 rounded-2xl border border-violet-400/30 bg-violet-400/[0.07] px-4 py-3 text-left text-sm text-slate-300">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-violet-300" />
        <span>
          <b className="font-semibold text-slate-100">For now, this works with your own AI in the browser.</b> An AI extension such as Claude in Chrome or Gemini in Chrome builds the plan on the page, or you paste the prompt into any AI chat. attunr doesn&apos;t run an AI of its own yet.
        </span>
      </p>

      {/* how practice is measured: quality over hours */}
      <div className="mx-auto mt-14 max-w-5xl">
        <h3 className="text-3xl text-slate-50 text-balance sm:text-4xl" style={DISPLAY}>
          Twenty focused minutes <span className="ls-accent italic text-amber-300">beat two distracted hours.</span>
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-slate-400">That&apos;s why attunr measures how engaged each student is, in three ways:</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {MEASURES.map((m) => (
            <li key={m.title} className={`${CARD} items-center text-center`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300"><Icon name={m.icon} size={20} /></span>
              <p className="text-xl text-slate-50" style={DISPLAY}>{m.title}</p>
              <p className="text-sm leading-relaxed text-slate-400">{m.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
