import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { HintProvider } from "@/components/ui";
import { PLAN_TOUR } from "@/features/guide/tours/plan";
import { PlanApp } from "@/features/plan";

export const metadata: Metadata = {
  title: "AI Guitar Practice Plan: Custom Daily Routines · attunr",
  description: "Generate a custom daily guitar practice plan with your AI. Answer a few questions, copy the prompt, and get structured daily drills for hands, ears, and timing.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    // one HintProvider over the page, so the "?" by the title arms the hints in every exercise tool
    <HintProvider>
      <PageShell active="/plan" full devices pageId="plan" tour={PLAN_TOUR} title="AI practice plan" intro="A continuous daily plan for your practice, written by your own AI. A new set of exercises opens each day, and each week builds on the last.">
        <PlanApp />
      </PageShell>
    </HintProvider>
  );
}
