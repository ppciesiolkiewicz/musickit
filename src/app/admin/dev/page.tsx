import Link from "next/link";
import DevShell from "@/features/devtools/DevShell";
import { DEV_GROUPS, TONE_CLASSES } from "@/features/devtools/registry";

export default function DevIndex() {
  return (
    <DevShell wide>
      <div className="flex flex-col gap-6">
        {DEV_GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${TONE_CLASSES[g.tone].label}`}>{g.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.tools.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className={`block h-full rounded-xl border bg-slate-900/60 p-4 transition ${TONE_CLASSES[g.tone].card}`}>
                    <span className={`font-semibold ${TONE_CLASSES[g.tone].label}`}>{t.label}</span>
                    <span className="mt-1 block text-sm text-slate-400">{t.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DevShell>
  );
}
