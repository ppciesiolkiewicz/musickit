import Link from "next/link";
import type { ReactNode } from "react";
import Wordmark from "@/components/Wordmark";

type Column = { title: string; links: { href: string; label: string }[] };

/** The two home pages, the app's three places (they need a login), the demo plans, and help (FAQ, terms). */
const COLUMNS: Column[] = [
  { title: "attunr for", links: [{ href: "/", label: "Music schools" }, { href: "/players", label: "Solo musicians" }] },
  { title: "The app", links: [{ href: "/plan", label: "Practice plan" }, { href: "/teachers/studio?notes=1", label: "Interactive notes" }, { href: "/practice", label: "Practice" }] },
  { title: "See it first", links: [{ href: "/demo", label: "Demos" }] },
  { title: "Help", links: [{ href: "/faq", label: "FAQ" }, { href: "/terms", label: "Terms of use" }] },
];

function Heading({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{children}</p>;
}

/** Grid classes per column count; written out in full so Tailwind sees them. */
const GRID: Record<number, { grid: string; brand: string }> = {
  4: { grid: "sm:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]", brand: "sm:col-span-4" },
  5: { grid: "sm:grid-cols-5 lg:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]", brand: "sm:col-span-5" },
};

/** The site footer, on every page: brand, then the two home pages, the app (Practice plan, Interactive notes, Practice), Demos and Help. */
export default function SiteFooter() {
  const columns = COLUMNS;
  const layout = GRID[columns.length];
  return (
    <footer className="border-t border-slate-800/70 pt-12 pb-8 text-sm sm:pt-16">
      <div className={`grid grid-cols-2 gap-x-6 gap-y-10 ${layout.grid} lg:gap-12`}>
        <div className={`col-span-2 ${layout.brand} lg:col-span-1`}>
          <Link href="/" aria-label="attunr home" className="inline-block rounded focus-visible:outline-2 focus-visible:outline-sky-400">
            <Wordmark className="text-2xl" dots="side" />
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
            See what you hear. A daily AI practice plan for guitar and voice, lesson notes you can share, and the tools to practise with.
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
        <p>
          Photos from Unsplash. Sounds from{" "}
          <a href="https://github.com/nbrosowsky/tonejs-instruments" className="underline decoration-slate-700 underline-offset-2 hover:text-slate-300">tonejs-instruments</a> and{" "}
          <a href="https://github.com/gleitz/midi-js-soundfonts" className="underline decoration-slate-700 underline-offset-2 hover:text-slate-300">Fluid R3 GM</a>,{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/" className="underline decoration-slate-700 underline-offset-2 hover:text-slate-300">CC BY 3.0</a>. Made for people who&apos;d rather play.
        </p>
      </div>
    </footer>
  );
}
