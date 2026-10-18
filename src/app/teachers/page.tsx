import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "For teachers · Music Kit",
  description: "Tools for guitar teachers: record lessons with any theory view on screen.",
};

export default function TeachersPage() {
  return (
    <PageShell active="/teachers" title="For teachers" intro="Tools for making lessons.">
      <Link href="/teachers/studio" className="inline-flex rounded-xl border border-slate-700 px-4 py-3 text-slate-100 hover:border-slate-500">
        Studio: record a lesson with chords, scales and a drone on screen →
      </Link>
    </PageShell>
  );
}
