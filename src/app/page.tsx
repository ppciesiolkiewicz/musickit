import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon, { type IconName } from "@/components/Icon";

type Item = { href: string; label: string; icon: IconName; text: string; more: string; tags: string[] };
const GROUPS: { title: string; blurb: string; items: Item[] }[] = [
  {
    title: "Apps",
    blurb: "Tools to use while you play.",
    items: [
      { href: "/tuner", label: "Tuner", icon: "gauge", text: "Guitar, bass, ukulele, violin or any note.", more: "A needle and cents readout so you can see how close you are.", tags: ["Mic", "Any instrument"] },
      { href: "/looper", label: "Looper", icon: "repeat", text: "Record loops, add drums, mix with effects.", more: "Stack takes over a drum loop, then balance and add effects.", tags: ["Layers", "Drums", "FX"] },
      { href: "/cheatsheet", label: "Cheatsheet builder", icon: "puzzle", text: "The theory of one key, as panels you arrange.", more: "Chords, scales and the circle for your key on one page.", tags: ["Any key", "Panels"] },
      { href: "/theory/drone", label: "Drone", icon: "audio-lines", text: "Hold one note and play a mode against it.", more: "Filter, modulation and a mode to hear each note's colour.", tags: ["Ear", "Modes"] },
    ],
  },
  {
    title: "Sections",
    blurb: "Theory you can see on the neck and hear.",
    items: [
      { href: "/theory", label: "Theory course", icon: "graduation-cap", text: "Stages, tracks and practice games.", more: "From first chords and songs to barres, the neck and modes.", tags: ["Lessons", "Games"] },
      { href: "/theory/chords", label: "Chords", icon: "music", text: "Shapes for the chords of any key and mode.", more: "Every chord of the key, with diagrams and loops to play.", tags: ["Shapes", "Progressions"] },
      { href: "/theory/scales", label: "Scales and modes", icon: "sliders-horizontal", text: "Scales on the neck, modes side by side.", more: "All 21 modes in any key, with pentatonic boxes on the neck.", tags: ["21 modes", "Positions"] },
      { href: "/theory/caged", label: "CAGED", icon: "guitar", text: "The five open shapes up the fretboard.", more: "See how C, A, G, E and D connect into one neck map.", tags: ["5 shapes", "Neck map"] },
      { href: "/theory/circle", label: "Circle of fifths", icon: "circle-dot", text: "Every key, its signature and its chords.", more: "Spin to a key and read its relatives and diatonic chords.", tags: ["Keys", "Signatures"] },
      { href: "/theory/improv", label: "Improvisation", icon: "drum", text: "Rhythm and motive exercises.", more: "Short drills for phrasing: rhythm cells and motives.", tags: ["Rhythm", "Motives"] },
    ],
  },
];

export default function Home() {
  return (
    <PageShell active="/" title="Music Kit" intro="Guitar theory, exercises and practice tools. Every page works in any key, plays what it shows, and colours notes by their job in the key.">
      <div className="flex flex-col gap-8">
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title} className="flex flex-col gap-3">
            <header className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-xs uppercase tracking-widest text-slate-500">{g.title}</h2>
              <p className="text-xs text-slate-400">{g.blurb}</p>
            </header>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {g.items.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="group flex aspect-square flex-col gap-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-400 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:p-4">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 transition group-hover:bg-sky-500/20">
                        <Icon name={t.icon} size={20} />
                      </span>
                      <span className="text-sm font-medium leading-tight text-slate-100 sm:text-base">{t.label}</span>
                    </span>
                    <span className="line-clamp-3 text-xs text-slate-300">{t.text}</span>
                    <span className="hidden text-xs text-slate-500 sm:line-clamp-3">{t.more}</span>
                    <span className="mt-auto hidden flex-wrap gap-1 sm:flex">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-700 px-1.5 py-px text-[10px] text-slate-400">{tag}</span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
