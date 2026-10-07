import Link from "next/link";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/", label: "Piano" },
  { href: "/chords", label: "Chords" },
  { href: "/triads", label: "Triads" },
  { href: "/scales", label: "Scales" },
  { href: "/arpeggios", label: "Arpeggios" },
];

/** Dark page frame with the Music Kit nav, shared by the guitar pages. */
export default function PageShell({ title, intro, active, children }: { title: string; intro?: string; active: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        <nav aria-label="Music Kit" className="flex flex-wrap items-center gap-1">
          <span className="mr-3 text-sm font-light tracking-widest text-slate-400">MUSIC KIT</span>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active === l.href ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${active === l.href ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <header>
          <h1 className="text-2xl font-light tracking-wide text-slate-100">{title}</h1>
          {intro && <p className="mt-1 max-w-3xl text-sm text-slate-400">{intro}</p>}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
