import Link from "next/link";
import AdminShell from "@/features/admin/AdminShell";
import { ADMIN_PAGES } from "@/features/admin/registry";

export default function AdminIndex() {
  return (
    <AdminShell>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ADMIN_PAGES.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="block rounded-xl border border-amber-500/30 bg-slate-900/60 p-4 transition hover:border-amber-400/70">
              <span className="font-semibold text-amber-200">{p.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{p.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
