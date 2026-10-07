import Link from "next/link";
import Piano from "@/components/Piano";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
      <h1 className="mb-8 text-2xl font-light tracking-widest text-slate-400">
        MUSIC KIT
      </h1>
      <Piano />
      <nav aria-label="Guitar tools" className="mt-10 flex flex-wrap justify-center gap-2 text-sm">
        {[
          ["/chords", "Chord explorer"],
          ["/triads", "Triads by string group"],
          ["/scales", "Scales and modes"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-slate-700 px-4 py-1.5 text-slate-300 transition hover:border-sky-400 hover:text-sky-100">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
