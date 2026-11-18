import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { PLAN_TOUR } from "@/features/guide/tours/plan";
import { PlanApp, PlanIntro } from "@/features/plan";
import { NotesEditorHost } from "@/features/teachers/notes";

export const metadata: Metadata = {
  title: "AI Guitar Practice Plan: Custom Daily Routines · attunr",
  description: "A custom daily guitar practice plan. Answer a few questions, and attunr puts together daily drills for hands, ears and timing from its library of exercises.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <PageShell active="/plan" column devices pageId="plan" tour={PLAN_TOUR} tourNudge title="Practice plan" intro={<PlanIntro />}>
      {/* no HintProvider: in a plan each tool has one help button, its tour (ToolTour), so SingAlong's "?" stays hidden */}
      {/* the day editor gets the studio's widget controls and palette from here (the plan never imports the studio) */}
      <NotesEditorHost>
        <PlanApp />
      </NotesEditorHost>
    </PageShell>
  );
}
