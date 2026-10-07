import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/chordKit/PageShell";
import { FAMILIES } from "@/lib/chordKit/theory";
import { MODE_PAGES } from "@/lib/chordKit/scales";

export const metadata: Metadata = {
  title: "Scales and modes · Music Kit",
  description: "A page for each of 21 modes: relatives, every chord, and its notes colour coded.",
};

export default function ScalesIndex() {
  return (
    <PageShell active="/scales" title="Scales and modes" intro="One page per mode. Open one, choose the key at the top, and see its relatives and every chord with the notes it is made of.">
      <div className="flex flex-col gap-6">
        {FAMILIES.map((fam, fi) => (
          <section key={fam.id}>
            <h2 className="mb-2 text-sm font-medium text-slate-200">{fam.label}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {MODE_PAGES.filter((m) => m.familyIndex === fi).map((m) => (
                <Link key={m.slug} href={`/scales/${m.slug}`} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-600">
                  <div className="text-sm text-slate-100">{m.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{fam.info[m.modeIndex].mood}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
