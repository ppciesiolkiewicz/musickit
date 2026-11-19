import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { googleConfig } from "@/features/account/server/google";
import JoinForm, { JoinTitle } from "@/features/account/ui/JoinForm";

export const metadata: Metadata = { title: "Teacher invite · attunr", robots: { index: false } };

/**
 * A teacher invite we sent (made on /admin/invites). Public: a visitor who isn't logged in sees the invite and logs in here
 * (email and code, or Google), not on /login, and comes straight back here, not to setup: a new account joins by itself (`JoinForm`).
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PageShell centered title={<JoinTitle />} active="/students">
      <JoinForm token={token} google={!!googleConfig()} />
    </PageShell>
  );
}
