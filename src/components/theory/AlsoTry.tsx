import Link from "next/link";
import Icon from "@/components/Icon";
import { THEORY_SECTIONS, TONE, type SectionGroup } from "@/features/theory/sections";

/** "Also try": a card for every other page in the page's nav group (label, line, icon and colour from the nav list). */
export default function AlsoTry({ group, current }: { group: SectionGroup; current: string }) {
  const others = THEORY_SECTIONS.filter((s) => s.group === group && s.href !== current);
  if (!others.length) return null;
  return (
    <section aria-labelledby="also-try-h" className="mt-10 border-t border-slate-800/70 pt-6">
      <h2 id="also-try-h" className="mb-3 text-xs uppercase tracking-widest text-slate-500">Also try</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {others.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="group flex h-full flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-600">
              <span className="flex items-center justify-between">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONE[s.tone].chip} ${TONE[s.tone].icon}`}><Icon name={s.icon} size={18} /></span>
                <span aria-hidden className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300">→</span>
              </span>
              <span className="font-semibold text-slate-100">{s.label}</span>
              <span className="text-sm leading-snug text-slate-400">{s.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
