import Link from "next/link";
import Piano from "@/components/Piano";
import Icon, { type IconName } from "@/components/Icon";

const TOOLS: { href: string; label: string; icon: IconName; text: string }[] = [
  { href: "/chords", label: "Chord explorer", icon: "music", text: "Guitar shapes for the chords of any key and mode." },
  { href: "/triads", label: "Triads", icon: "audio-lines", text: "Triads on every string group." },
  { href: "/scales", label: "Scales and modes", icon: "sliders-horizontal", text: "Scales on the neck, modes side by side." },
  { href: "/arpeggios", label: "Arpeggios", icon: "activity", text: "Arpeggio shapes across the neck." },
  { href: "/caged", label: "CAGED", icon: "piano", text: "The five open shapes up the fretboard." },
  { href: "/looper", label: "Looper", icon: "repeat", text: "Record loops, add drums and a scale piano, mix with buses and effects." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-2 py-3 text-slate-200">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-light tracking-widest text-slate-300">MUSIC KIT</h1>
          <p className="text-sm text-slate-400">Guitar tools for learning, and a looper for playing.</p>
        </header>
        <nav aria-label="Tools" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-100"><Icon name={t.icon} className="text-sky-300" />{t.label}</span>
              <span className="text-xs text-slate-400">{t.text}</span>
            </Link>
          ))}
        </nav>
        <section aria-label="Piano" className="flex flex-col items-center gap-2">
          <h2 className="text-xs uppercase tracking-widest text-slate-500">Piano: play with your keyboard</h2>
          <Piano />
        </section>
      </main>
    </div>
  );
}
