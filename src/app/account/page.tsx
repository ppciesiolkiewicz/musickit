import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AccountPanel from "@/features/account/ui/AccountPanel";

export const metadata: Metadata = { title: "Your account · attunr", robots: { index: false } };

export default function AccountPage() {
  return (
    <PageShell title="Your account" active="/account">
      <AccountPanel />
    </PageShell>
  );
}
