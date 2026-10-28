import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { PlanApp } from "@/features/plan";

export const metadata: Metadata = {
  title: "AI practice plan · attunr",
  description: "A continuous daily plan for your practice, written by your own AI: answer a few questions, copy the prompt, paste the reply, practise a new set of exercises each day.",
};

export default function PlanPage() {
  return (
    <PageShell active="/plan" devices title="AI practice plan" intro="A continuous daily plan for your practice, written by your own AI. A new set of exercises opens each day, and each week builds on the last.">
      <PlanApp />
    </PageShell>
  );
}
