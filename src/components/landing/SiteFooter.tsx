import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/Wordmark";

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
  {
    title: "Teachers",
    links: [
      { href: "/teach", label: "Teach on Music Kit" },
      { href: "/teachers/studio", label: "Video studio" },
    ],
  },
];

function Heading({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{children}</p>;
}

/** The landing pages' footer: brand, then Learn, Free tools and Teachers (the teaching pitch and the video studio). */
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/70 pt-12 pb-8 text-sm sm:pt-16">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
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
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800/70 pt-6 text-xs text-slate-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Music Kit</p>
        <p>Photos from Unsplash. Made for people who&apos;d rather play.</p>
      </div>
    </footer>
  );
}
