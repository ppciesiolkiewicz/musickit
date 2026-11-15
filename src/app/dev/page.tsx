import Link from "next/link";
import DevShell from "@/features/devtools/DevShell";
import { DEV_TOOLS, TONE_CLASSES } from "@/features/devtools/registry";

export default function DevIndex() {
  return (
    <DevShell wide>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DEV_TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className={`block rounded-xl border bg-slate-900/60 p-4 transition ${TONE_CLASSES[t.tone].card}`}>
              <span className={`font-semibold ${TONE_CLASSES[t.tone].label}`}>{t.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{t.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </DevShell>
  );
}
