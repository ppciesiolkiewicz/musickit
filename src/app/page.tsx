import Link from "next/link";
import Piano from "@/components/Piano";
import Icon, { type IconName } from "@/components/Icon";

/* The words on this page live here so they are easy to change. */
const STORY = {
  title: "Four years of music, mostly in the last six months",
  lead: "I have been learning music for four years. People are sometimes impressed, but about 90% of what I can do I learned in the last six months.",
  body: "I think what changed is that theory and practice finally fit together: I knew why something worked, and I had an exercise that put it in my hands. This site is me collecting that in one place, a comprehensive set of theory and exercises for guitar, built as I learn it.",
};

type Tool = { href: string; label: string; icon: IconName; text: string };
const STEPS: { n: number; title: string; blurb: string; tools: Tool[] }[] = [
  {
    n: 1,
    title: "Understand it",
    blurb: "The theory, shown on the neck instead of described.",
    tools: [
      { href: "/chords", label: "Chord explorer", icon: "music", text: "Shapes for the chords of any key and mode." },
      { href: "/triads", label: "Triads", icon: "audio-lines", text: "Triads on every string group." },
      { href: "/scales", label: "Scales and modes", icon: "sliders-horizontal", text: "Scales on the neck, modes side by side." },
      { href: "/arpeggios", label: "Arpeggios", icon: "activity", text: "Arpeggio shapes across the neck." },
      { href: "/caged", label: "CAGED", icon: "piano", text: "The five open shapes up the fretboard." },
    ],
  },
  {
    n: 2,
    title: "Practise it",
    blurb: "Exercises and games that turn an idea into something your hands can do.",
    tools: [{ href: "/improv", label: "Improvisation", icon: "drum", text: "Schillinger rhythm and motive exercises, with practice games." }],
  },
  {
    n: 3,
    title: "Play it",
    blurb: "Record, layer and play along, with a metronome that keeps you honest.",
    tools: [{ href: "/looper", label: "Looper", icon: "repeat", text: "Record loops, add drums and a scale piano, mix with buses and effects." }],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-2 py-4 text-slate-200">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Music Kit</p>
          <h1 className="max-w-3xl text-balance text-3xl font-light leading-tight tracking-tight text-slate-50 sm:text-4xl">{STORY.title}</h1>
          <p className="max-w-2xl text-base text-slate-300">{STORY.lead}</p>
          <p className="max-w-2xl text-sm text-slate-400">{STORY.body}</p>
        </header>

        <ol className="flex flex-col gap-4" aria-label="How the site fits together">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-sky-400/60 text-xs text-sky-200">{s.n}</span>
                <h2 className="text-lg font-medium text-slate-100">{s.title}</h2>
                <p className="text-sm text-slate-500">{s.blurb}</p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {s.tools.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="flex h-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-100"><Icon name={t.icon} className="text-sky-300" />{t.label}</span>
                      <span className="text-xs text-slate-400">{t.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section aria-label="Piano" className="flex flex-col items-center gap-2 border-t border-slate-800 pt-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-500">Warm up: play the piano with your keyboard</h2>
          <Piano />
        </section>
      </main>
    </div>
  );
}
