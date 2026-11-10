import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import FinishSignup from "@/features/account/ui/FinishSignup";

export const metadata: Metadata = { title: "Create account · attunr", robots: { index: false } };

export default async function FinishPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Create account" active="/register">
      <FinishSignup next={safeNext(q.next)} />
    </PageShell>
  );
}
