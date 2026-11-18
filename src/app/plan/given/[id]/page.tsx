import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import GivenPlan, { GivenPlanTitle } from "@/features/plan/GivenPlan";
import { NotesEditorHost } from "@/features/teachers/notes";

// the tab title is drawn on the server, without the plan: "Practice plan" is true of a shared plan and of a teacher's week
export const metadata: Metadata = { title: "Practice plan · attunr", robots: { index: false } };

/**
 * A plan the player was given (claimed from an invite, or a week their teacher made), at its own address beside their daily plan on `/plan`. Not public:
 * the proxy and `LoginGuard` send a signed-out visitor to log in first. `GivenPlan` finds it in the player's given plans.
 */
export default async function GivenPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell active="/plan" column devices title={<GivenPlanTitle id={id} />}>
      {/* the day editor gets the studio's widget controls and palette from here (the plan never imports the studio) */}
      <NotesEditorHost>
        <GivenPlan id={id} />
      </NotesEditorHost>
    </PageShell>
  );
}
