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
    title: `${demo?.label ?? "Demo"}: a ready-made practice plan · attunr`,
    description: "A week of guitar and voice practice from attunr's library: open any day and try its tools.",
    // the same page as /plan, so search sends people there
    alternates: { canonical: "/plan" },
    robots: { index: false },
  };
}

/** A ready-made plan to look at, at /demo/<slug> (the slugs of DEMO_PLANS). */
export default async function DemoPage({ params }: { params: Promise<Params> }) {
  const demo = demoPlan((await params).slug);
  if (!demo) notFound();
  return (
    <PageShell active="/plan" column devices pageId="plan" tour={PLAN_TOUR} title={`Demo: ${demo.label}`} intro="A week of practice from attunr's library. Open any day and play with its tools. Nothing here is saved.">
      {/* HintProvider under the shell, so the title row shows no "?" */}
      <HintProvider>
        <DemoPlan config={demo.config} />
      </HintProvider>
    </PageShell>
  );
}
