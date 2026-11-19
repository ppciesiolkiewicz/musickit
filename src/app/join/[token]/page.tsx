import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { googleConfig } from "@/features/account/server/google";
import JoinForm from "@/features/account/ui/JoinForm";

export const metadata: Metadata = { title: "Teacher invite · attunr", robots: { index: false } };

/**
 * A teacher invite we sent (made on /admin/invites). Public: a visitor who isn't logged in sees the invite and logs in here
 * (email and code, or Google), not on /login, and comes straight back here, not to setup: `JoinForm` asks its name and the terms.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PageShell centered title="You've been invited to a free attunr teacher account" active="/students">
      <JoinForm token={token} google={!!googleConfig()} />
    </PageShell>
  );
}
