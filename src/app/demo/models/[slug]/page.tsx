import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { HintProvider } from "@/components/ui";
import { PLAN_TOUR } from "@/features/guide/tours/plan";
import { DemoPlan } from "@/features/plan";
import { MODEL_PLANS, modelPlan } from "@/features/plan/modelPlans";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(MODEL_PLANS).map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = MODEL_PLANS[(await params).slug];
  return {
    title: `${p ? `${p.player}, by ${p.modelLabel}` : "Demo"}: an AI practice plan · attunr`,
    description: "A week of daily exercises an AI model wrote for a made-up player, played in attunr.",
    alternates: { canonical: "/plan" },
    robots: { index: false, follow: false },
  };
}

/**
 * A plan one AI model wrote for one made-up player, at /demo/models/<slug> (`MODEL_PLANS`). Public for sharing, listed
 * nowhere: /demo shows only DEMO_PLANS.
 */
export default async function ModelPlanPage({ params }: { params: Promise<Params> }) {
  const p = modelPlan((await params).slug);
  if (!p) notFound();
  return (
    <PageShell
      active="/plan" column devices pageId="plan" tour={PLAN_TOUR}
      title={`${p.player}, by ${p.modelLabel}`}
      intro={`A first week of daily exercises, as ${p.modelLabel} wrote it for a made-up player. Open any day and play with its tools. Nothing here is saved.`}
    >
      <HintProvider>
        <DemoPlan config={p.config} />
      </HintProvider>
    </PageShell>
  );
}
