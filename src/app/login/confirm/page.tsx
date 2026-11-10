import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ConfirmLink from "@/features/account/ui/ConfirmLink";

export const metadata: Metadata = { title: "Log in · attunr", robots: { index: false }, referrer: "no-referrer" };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell title="Almost there" active="/login">
      <ConfirmLink token={typeof q.token === "string" ? q.token : ""} />
    </PageShell>
  );
}
