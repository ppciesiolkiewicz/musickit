import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/Wordmark";

/** The players' home page (src/app/players/page.tsx); plain / is the music-school one. */
const PLAYERS = "/players";

type Column = { title: string; links: { href: string; label: string }[] };

const COLUMNS: Column[] = [
  {
    title: "attunr for",
    links: [
      { href: "/", label: "Music schools" },
      { href: PLAYERS, label: "Players" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: `${PLAYERS}#course`, label: "Video course" },
      { href: `${PLAYERS}#lessons`, label: "Private lessons" },
      { href: `${PLAYERS}#lessons`, label: "VIP coaching" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/theory/scales", label: "Scales" },
      { href: "/theory/metronome-drone", label: "Metronome & drone" },
      { href: "/looper", label: "Looper" },
      { href: "/tuner", label: "Tuner" },
    ],
  },
  {
    title: "Teachers",
    links: [
      { href: "/teach", label: "Teach on attunr" },
      { href: "/#white-label", label: "White-labelling" },
      { href: "/teachers/studio", label: "Teaching studio" },
      { href: "/teachers/studio?notes=1", label: "Notes creator" },
      { href: "/kickstarter", label: "Founding partners" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
    ],
  },
];

function Heading({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{children}</p>;
}

/** The music-school home leaves out what is for players and solo teachers: the Learn column (course, lessons, coaching) and "Teach on attunr". */
function schoolColumns(): Column[] {
  return COLUMNS.filter((c) => c.title !== "Learn").map((c) => ({ ...c, links: c.links.filter((l) => l.href !== "/teach") }));
}

/** Grid classes per column count; written out in full so Tailwind sees them. */
const GRID: Record<number, { grid: string; brand: string }> = {
  4: { grid: "sm:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]", brand: "sm:col-span-4" },
  5: { grid: "sm:grid-cols-5 lg:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]", brand: "sm:col-span-5" },
};

/** The site footer, on every page: brand, then the two home pages (schools at /, players at /players), Learn, Free tools, Teachers (the teaching pitch and the video studio) and Help. variant="schools" (the music-school home) drops the player and solo-teacher links. */
export default function SiteFooter({ variant = "default" }: { variant?: "default" | "schools" }) {
  const columns = variant === "schools" ? schoolColumns() : COLUMNS;
  const layout = GRID[columns.length];
  return (
    <footer className="border-t border-slate-800/70 pt-12 pb-8 text-sm sm:pt-16">
      <div className={`grid grid-cols-2 gap-x-6 gap-y-10 ${layout.grid} lg:gap-12`}>
        <div className={`col-span-2 ${layout.brand} lg:col-span-1`}>
          <Link href="/" aria-label="attunr home" className="inline-block rounded focus-visible:outline-2 focus-visible:outline-sky-400">
            <Wordmark className="text-2xl" dots="side" />
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
            See what you hear. Guitar and voice teaching tools for music schools, and practice, a video course and lessons for guitarists who&apos;d rather play.
          </p>
        </div>

        {columns.map((c) => (
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
        <p>© {new Date().getFullYear()} attunr. ABN 48 737 987 261. All rights reserved.</p>
        <p>Photos from Unsplash. Made for people who&apos;d rather play.</p>
      </div>
    </footer>
  );
}
