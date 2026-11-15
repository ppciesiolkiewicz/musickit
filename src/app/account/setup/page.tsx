import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { AFTER_LOGIN, safeNext } from "@/features/account/server/auth";
import SetupForm from "@/features/account/ui/SetupForm";

export const metadata: Metadata = { title: "Set up your account · attunr", robots: { index: false } };

/**
 * An account with no plan lands here after signing in (`pathAfterSignIn`) and from every other app page (`LoginGuard`):
 * name and plan, then the page it was going to.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  return (
    <PageShell centered title="Set up your account" intro="Tell us your name and choose a plan." active="/account">
      <SetupForm next={safeNext(q.next) ?? AFTER_LOGIN} />
    </PageShell>
  );
}
