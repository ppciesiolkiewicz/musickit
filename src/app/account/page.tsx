import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AccountPanel from "@/features/account/ui/AccountPanel";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";

export const metadata: Metadata = { title: "Your account · attunr", robots: { index: false } };

/** `?for=teachers` (from "Become a founding partner") opens the plans on their Teachers side. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell title="Your account" active="/account">
      <AccountPanel start={q.for === "teachers" ? "teachers" : null} payments={paymentsEnabled()} />
    </PageShell>
  );
}
