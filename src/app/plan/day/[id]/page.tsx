import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PastDay from "@/features/plan/PastDay";

export const metadata: Metadata = { title: "Past day · attunr", robots: { index: false } };

/**
 * One of the player's past days, read-only, at its own address beside `/plan` (which links to the last few). Not public:
 * the proxy and `LoginGuard` send a signed-out visitor to log in first. `PastDay` finds it in the player's past days.
 */
export default async function PastDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell active="/plan" column devices title="Past day">
      <PastDay id={id} />
    </PageShell>
  );
}
