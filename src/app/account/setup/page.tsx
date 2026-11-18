import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { AFTER_LOGIN, safeNext } from "@/features/account/server/auth";
import { asksForTeachers } from "@/features/account/loginGuard";
import SetupForm from "@/features/account/ui/SetupForm";

export const metadata: Metadata = { title: "Set up your account · attunr", robots: { index: false } };

/**
 * An account with no plan lands here after signing in (`pathAfterSignIn`) and from every other app page (`LoginGuard`):
 * name and plan, then the page it was going to.
 */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string; for?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next) ?? AFTER_LOGIN;
  // the Teachers side, asked for here or by the page it goes on to ("Become a founding partner")
  const start = q.for === "teachers" || asksForTeachers(next) ? "teachers" : null;
  return (
    <PageShell centered title="Set up your account" active="/account">
      <SetupForm next={next} start={start} />
    </PageShell>
  );
}
