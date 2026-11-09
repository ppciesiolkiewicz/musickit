import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "attunr for Guitar Teachers: Studio & Lesson Tools · attunr",
  description: "Interactive tools for guitar teachers: record video lessons with synchronized fretboard diagrams, chord shapes, scales, and live backing loops on screen.",
  alternates: { canonical: "/teachers" },
};

export default function TeachersPage() {
  return (
    <PageShell active="/teachers" title="For teachers" intro="Tools for making lessons.">
      <div className="flex flex-col items-start">
        <Link href="/teachers/studio" className="inline-flex rounded-xl border border-slate-700 px-4 py-3 text-slate-100 hover:border-slate-500">
          Studio: record a lesson with chords, scales and a drone on screen →
        </Link>
        <Link href="/teachers/studio?notes=1" className="mt-3 inline-flex rounded-xl border border-slate-700 px-4 py-3 text-slate-100 hover:border-slate-500">
          Notes creator: build a page of notes and share it as a link →
        </Link>
      </div>
    </PageShell>
  );
}
