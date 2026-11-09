import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { HintProvider } from "@/components/ui";
import { PLAN_TOUR } from "@/features/guide/tours/plan";
import { DEMO_PLANS, DemoPlan, demoPlan } from "@/features/plan";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(DEMO_PLANS).map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const demo = demoPlan((await params).slug);
  return {
    title: `${demo?.label ?? "Demo"}: a ready-made AI practice plan · attunr`,
    description: "A week of daily guitar and voice exercises, written by an AI and played in attunr: open any day and try its tools.",
    // the same page as /plan, so search sends people there
    alternates: { canonical: "/plan" },
    robots: { index: false },
  };
}

/** A ready-made AI plan to look at, at /demo/guitar and /demo/voice. */
export default async function DemoPage({ params }: { params: Promise<Params> }) {
  const demo = demoPlan((await params).slug);
  if (!demo) notFound();
  return (
    <PageShell active="/plan" devices pageId="plan" tour={PLAN_TOUR} title={`Demo: ${demo.label}`} intro="A week of daily exercises, as the AI wrote them for attunr. Open any day and play with its tools. Nothing here is saved.">
      {/* HintProvider under the shell, so the title row shows no "?" */}
      <HintProvider>
        <DemoPlan config={demo.config} />
      </HintProvider>
    </PageShell>
  );
}
