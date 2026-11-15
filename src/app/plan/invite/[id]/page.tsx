import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import InviteClaim from "@/features/plan/ui/InviteClaim";

export const metadata: Metadata = { title: "Plan invite · attunr", robots: { index: false } };

/**
 * A teacher's plan invite. Not public: the proxy and `LoginGuard` send a signed-out visitor to log in first (the login page
 * words itself for an invite), so nothing of the plan shows before. Signed in, `InviteClaim` adds the copy and opens /plan.
 */
export default async function PlanInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell centered title="Plan invite" active="/plan">
      <InviteClaim id={id} />
    </PageShell>
  );
}
