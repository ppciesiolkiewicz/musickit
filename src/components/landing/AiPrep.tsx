import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { BetaBadge, DISPLAY, Eyebrow, H2 } from "@/components/landing/Display";

/*
 * The first section of the founding-partner page (/kickstarter), right under the hero: the two things a teacher does in
 * each lesson, short. The AI practice plan works today; AI drafting of lesson notes is not built yet, so that card says
 * "AI drafting soon". attunr runs no AI of its own: the plan is written by the reader's AI (an AI extension or any AI
 * chat), which the line under the cards says. The facts are FACTS in src/features/devtools/model/kickstarter.ts.
 */

const CARD = "ls-card flex flex-col items-start gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 text-left sm:p-6";
const GHOST = "ls-btn inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800/40";

function Badge({ soon = false, children }: { soon?: boolean; children: string }) {
  const tone = soon ? "border-sky-400/40 bg-sky-400/10 text-sky-300" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" /> {children}
    </span>
  );
}

const TOOLS: { icon: IconName; tone: string; title: string; badges: { text: string; soon?: boolean }[]; text: string; links: { href: string; icon: IconName; label: string }[] }[] = [
  {
    icon: "sparkles",
    tone: "bg-violet-500/15 text-violet-300",
    title: "AI practice plan",
    badges: [{ text: "Works today" }],
    text: "A week of short daily exercises for guitar or voice. Each new week builds on how the last one went.",
    links: [
      { href: "/demo/guitar-beginner", icon: "play", label: "See a week" },
      { href: "/plan", icon: "sparkles", label: "Build a plan" },
    ],
  },
  {
    icon: "file-text",
    tone: "bg-teal-500/15 text-teal-300",
    title: "Interactive lesson notes",
    badges: [{ text: "Works today" }, { text: "AI drafting soon", soon: true }],
    text: "Today's scales, chords and exercises on one page, sent to the student as a link. Every diagram plays.",
    links: [
      { href: "/note/minor-pentatonic", icon: "file-text", label: "Open a lesson note" },
      { href: "/teachers/studio?notes=1", icon: "pencil", label: "Open the notes creator" },
    ],
  },
];

export default function AiPrep() {
  return (
    <section id="ai" aria-labelledby="ai-h" className="scroll-mt-24 sect-rule py-12 text-center sm:py-16">
      <Eyebrow tone="text-violet-300">In every lesson<BetaBadge /></Eyebrow>
      <H2 id="ai-h">Next week&apos;s practice, <span className="ls-accent italic text-violet-300">ready in minutes.</span></H2>

      <ul className="mt-10 grid gap-4 lg:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.title} className={CARD}>
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.tone}`}><Icon name={t.icon} size={20} /></span>
              <h3 className="text-2xl text-slate-50" style={DISPLAY}>{t.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.badges.map((b) => <Badge key={b.text} soon={b.soon}>{b.text}</Badge>)}
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{t.text}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              {t.links.map((l) => (
                <Link key={l.href} href={l.href} className={GHOST}><Icon name={l.icon} size={16} /> {l.label}</Link>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-6 inline-flex max-w-2xl items-start gap-2.5 rounded-2xl border border-violet-400/30 bg-violet-400/[0.07] px-4 py-3 text-left text-sm text-slate-300">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-violet-300" />
        <span>
          <b className="font-semibold text-slate-100">In the beta, the AI part runs on your own AI.</b> Use an AI extension in your browser, such as Claude in Chrome, or paste the prompt into any AI chat. That&apos;s how I keep it free and open.
        </span>
      </p>
    </section>
  );
}
