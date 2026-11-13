import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { safeNext } from "@/features/account/server/auth";
import FinishSignup from "@/features/account/ui/FinishSignup";

export const metadata: Metadata = { title: "Set up your account · attunr", robots: { index: false } };

/** After a log-in link or Google proved an email that has no account yet: the name, and the account is made. */
export default async function AccountSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Set up your account" active="/login">
      <FinishSignup next={safeNext(q.next)} />
    </PageShell>
  );
}
