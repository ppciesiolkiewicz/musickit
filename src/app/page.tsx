import Link from "next/link";
import PageShell from "@/components/PageShell";
import Icon, { type IconName } from "@/components/Icon";

type Item = { href: string; label: string; icon: IconName; text: string };
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Apps",
    items: [
      { href: "/tuner", label: "Tuner", icon: "gauge", text: "Guitar, bass, ukulele, violin or any note." },
      { href: "/looper", label: "Looper", icon: "repeat", text: "Record loops, add drums, mix with effects." },
      { href: "/cheatsheet", label: "Cheatsheet builder", icon: "puzzle", text: "The theory of one key, as panels you arrange." },
      { href: "/theory/drone", label: "Drone", icon: "audio-lines", text: "Hold one note and play a mode against it." },
    ],
  },
  {
    title: "Sections",
    items: [
      { href: "/theory", label: "Theory course", icon: "graduation-cap", text: "Stages, tracks and practice games." },
      { href: "/theory/chords", label: "Chords", icon: "music", text: "Shapes for the chords of any key and mode." },
      { href: "/theory/scales", label: "Scales and modes", icon: "sliders-horizontal", text: "Scales on the neck, modes side by side." },
      { href: "/theory/caged", label: "CAGED", icon: "guitar", text: "The five open shapes up the fretboard." },
      { href: "/theory/circle", label: "Circle of fifths", icon: "circle-dot", text: "Every key, its signature and its chords." },
      { href: "/theory/improv", label: "Improvisation", icon: "drum", text: "Rhythm and motive exercises." },
    ],
  },
];

export default function Home() {
  return (
    <PageShell active="/" title="Music Kit" intro="Guitar theory, exercises and practice tools.">
      <div className="flex flex-col gap-6">
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title} className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-widest text-slate-500">{g.title}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="flex h-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-100"><Icon name={t.icon} className="text-sky-300" />{t.label}</span>
                    <span className="text-xs text-slate-400">{t.text}</span>
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
