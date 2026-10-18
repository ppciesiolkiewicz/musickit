import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/Wordmark";
import Icon from "@/components/Icon";
import EarlyAccessForm from "@/components/landing/EarlyAccessForm";
import { DISPLAY } from "@/components/landing/Display";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Learn",
    links: [
      { href: "/#course", label: "Video course" },
      { href: "/#lessons", label: "Private lessons" },
      { href: "/#lessons", label: "VIP coaching" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/theory", label: "Theory" },
      { href: "/theory/scales", label: "Scales" },
      { href: "/theory/drone", label: "Drone" },
      { href: "/looper", label: "Looper" },
      { href: "/tuner", label: "Tuner" },
    ],
  },
];

const PERKS = [
  "Any scale, chord, drone or loop mid-lesson",
  "Lesson notes drafted for you",
  "Students arrive knowing the colours",
  "Your rate; founding teachers keep almost all of it",
];

function Heading({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{children}</p>;
}

/** The landing page footer: brand, site links, and the Teachers section (teaching on Music Kit and the video studio). */
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/70 pt-12 pb-8 text-sm sm:pt-16">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,1.5fr)] lg:gap-12">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" aria-label="Music Kit home" className="inline-block rounded focus-visible:outline-2 focus-visible:outline-sky-400">
            <Wordmark className="text-2xl" />
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
            See what you hear. A video course, private lessons and free tools for guitarists who&apos;d rather play.
          </p>
        </div>

        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <Heading>{c.title}</Heading>
            <ul className="flex flex-col gap-2.5">
              {c.links.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-slate-400 transition hover:text-slate-100">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}

        <section aria-labelledby="footer-teachers-h" className="ls-card rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6 col-span-2 lg:col-span-1">
          <h2 id="footer-teachers-h" className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Teachers</h2>
          <p className="text-2xl leading-tight text-slate-50" style={DISPLAY}>Teach with every sound <span className="ls-accent italic text-amber-300">a click away.</span></p>
          <ul className="mt-4 grid gap-x-5 gap-y-2 text-slate-300 sm:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-amber-300" /><span>{p}</span></li>
            ))}
          </ul>
          <Link href="/teachers/studio" className="group mt-5 flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3 transition hover:border-amber-400/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300"><Icon name="layers" size={18} /></span>
            <span className="min-w-0">
              <b className="block font-semibold text-slate-100">Video studio</b>
              <span className="text-xs text-slate-400">Record a lesson with chords, scales and a drone on screen</span>
            </span>
            <span aria-hidden className="ml-auto text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-amber-300">→</span>
          </Link>
          <div className="mt-5">
            <EarlyAccessForm source="teachers" compact initial={["teaching"]} cta="I want to teach" done="Thanks! We'll get in touch about teaching on Music Kit." />
          </div>
        </section>
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800/70 pt-6 text-xs text-slate-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Music Kit</p>
        <p>Photos from Unsplash. Made for people who&apos;d rather play.</p>
      </div>
    </footer>
  );
}
