import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { PlanApp } from "@/features/plan";

export const metadata: Metadata = {
  title: "AI practice plan · attunr",
  description: "A 7-day practice plan made by your own AI: answer a few questions, copy the prompt, paste the reply, practise a new set of exercises each day.",
};

export default function PlanPage() {
  return (
    <PageShell active="/plan" title="AI practice plan" intro="Seven days of exercises written for you by your own AI. Answer a few questions, copy the prompt, paste the reply back. A new day opens each day; when the week is done, the next prompt builds on it.">
      <PlanApp />
    </PageShell>
  );
}
