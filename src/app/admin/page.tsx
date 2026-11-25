import Link from "next/link";
import PageShell from "@/components/PageShell";
import { hubSections } from "@/features/admin/hub";
import { openPermissions } from "@/features/devtools/server/access";

export const dynamic = "force-dynamic";

/** The /admin hub: a card for each half the viewer may open, Content and Admin. */
export default async function AdminHub() {
  const sections = hubSections(await openPermissions());
  return (
    <PageShell active="/admin" wide title="Admin" intro="Running the app and writing its lessons.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block rounded-xl border border-amber-500/30 bg-slate-900/60 p-4 transition hover:border-amber-400/70">
              <span className="font-semibold text-amber-200">{s.label}</span>
              <span className="mt-1 block text-sm text-slate-400">{s.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
