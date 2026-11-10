import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { DEMO_PLANS } from "@/features/plan";

export const metadata: Metadata = {
  title: "Demos: ready-made AI practice plans · attunr",
  description: "Ready-made weeks of daily exercises, written by an AI and played in attunr.",
  alternates: { canonical: "/plan" },
  robots: { index: false },
};

/** Every demo plan in one list, so a pitch can link to /demo. */
export default function DemoIndex() {
  return (
    <PageShell active="/plan" title="Demos" intro="Ready-made plans, as the AI wrote them for attunr. Open one to try its exercises. Nothing here is saved.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {Object.entries(DEMO_PLANS).map(([slug, demo]) => (
          <li key={slug}>
            <Link href={`/demo/${slug}`} className="block rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-slate-100 transition hover:border-slate-500">
              <span className="font-semibold">{demo.label}</span>
              <span className="mt-1 block text-sm text-slate-400">A week of daily exercises</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
