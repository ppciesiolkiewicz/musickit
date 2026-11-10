import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { DEMO_PLANS } from "@/features/plan";
import { PRESET_INFO } from "@/features/teachers/studio";

export const metadata: Metadata = {
  title: "Demos: ready-made AI practice plans and teacher notes · attunr",
  description: "Ready-made weeks of daily exercises, written by an AI and played in attunr, and notes a teacher made ahead.",
  alternates: { canonical: "/plan" },
  robots: { index: false },
};

const CARD = "block rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-slate-100 transition hover:border-slate-500";
const HEADING = "mb-3 text-lg font-semibold text-slate-100";

/** Every demo in one list (the plans at /demo/<slug>, the teacher notes at /note/<slug>), so a pitch can link to /demo. */
export default function DemoIndex() {
  return (
    <PageShell active="/plan" title="Demos" intro="Ready-made plans and notes. Open one to try it. Nothing here is saved.">
      <section>
        <h2 className={HEADING}>Practice plans</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Object.entries(DEMO_PLANS).map(([slug, demo]) => (
            <li key={slug}>
              <Link href={`/demo/${slug}`} className={CARD}>
                <span className="font-semibold">{demo.label}</span>
                <span className="mt-1 block text-sm text-slate-400">A week of daily exercises, as the AI wrote it</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className={HEADING}>Teacher notes</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Object.entries(PRESET_INFO).map(([slug, note]) => (
            <li key={slug}>
              <Link href={`/note/${slug}`} className={CARD}>
                <span className="font-semibold">{note.title}</span>
                <span className="mt-1 block text-sm text-slate-400">{note.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
