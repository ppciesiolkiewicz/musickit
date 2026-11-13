import Link from "next/link";
import Icon from "@/components/Icon";
import { THEORY_SECTIONS, TONE } from "@/features/theory/sections";

/** The singing pages that draw your voice on the staff, and Farinelli breathing to go with them. */
export const STAFF_SINGING = ["/theory/singing", "/theory/singing/melodies", "/theory/singing/runs", "/theory/singing/intervals", "/theory/singing/warm-ups", "/theory/singing/breathing"];

/** "Also try": a small link, opening in a new tab so the page you sing on stays, for each of `hrefs` but the page you are on (label, icon and colour from the nav list). */
export default function AlsoTry({ current, hrefs = STAFF_SINGING }: { current: string; hrefs?: string[] }) {
  const others = hrefs.filter((h) => h !== current).flatMap((h) => THEORY_SECTIONS.filter((s) => s.href === h));
  if (!others.length) return null;
  return (
    <nav aria-label="Also try" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-widest text-slate-500">Also try</span>
      {others.map((s) => (
        <Link key={s.href} href={s.href} target="_blank" rel="noopener" title={s.desc} className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/40 py-1 pr-3 pl-1 text-slate-300 transition hover:border-slate-600 hover:text-slate-50">
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${TONE[s.tone].chip} ${TONE[s.tone].icon}`}><Icon name={s.icon} size={14} /></span>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
