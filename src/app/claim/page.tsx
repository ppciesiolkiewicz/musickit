import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ClaimLink from "@/features/students/ui/ClaimLink";

export const metadata: Metadata = { title: "Your account · attunr", robots: { index: false }, referrer: "no-referrer" };

/** The link mailed to a teacher's new student (`/claim?token=`). Public: the student isn't logged in yet. */
export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Your account" active="/login">
      <ClaimLink token={typeof q.token === "string" ? q.token : ""} />
    </PageShell>
  );
}
