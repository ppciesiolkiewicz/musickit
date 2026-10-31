import Link from "next/link";
import { DEV_TOOLS } from "@/features/devtools/registry";

export default function DevIndex() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {DEV_TOOLS.map((t) => (
        <li key={t.href}>
          <Link href={t.href} className="block rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-sky-500/70">
            <span className="font-semibold text-sky-200">{t.label}</span>
            <span className="mt-1 block text-sm text-slate-400">{t.desc}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
