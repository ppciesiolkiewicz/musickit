import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import GivenPlan from "@/features/plan/GivenPlan";
import { SHARED_PLAN } from "@/features/plan/ui/GivenPlans";
import { NotesEditorHost } from "@/features/teachers/notes";

export const metadata: Metadata = { title: `${SHARED_PLAN} · attunr`, robots: { index: false } };

/**
 * A plan the player was given (claimed from an invite), at its own address beside their daily plan on `/plan`. Not public:
 * the proxy and `LoginGuard` send a signed-out visitor to log in first. `GivenPlan` finds it in the player's given plans.
 */
export default async function GivenPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell active="/plan" column devices title={SHARED_PLAN}>
      {/* the day editor gets the studio's widget controls and palette from here (the plan never imports the studio) */}
      <NotesEditorHost>
        <GivenPlan id={id} />
      </NotesEditorHost>
    </PageShell>
  );
}
