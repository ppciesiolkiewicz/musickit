import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import JoinForm from "@/features/account/ui/JoinForm";

export const metadata: Metadata = { title: "Teacher invite · attunr", robots: { index: false } };

/**
 * A teacher invite we sent (made on /admin/invites). Not public: a signed-out visitor logs in first (the login page words
 * itself for it), and a new account comes straight back here, not to setup: `JoinForm` asks its name and the terms.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PageShell centered title="Teacher invite" active="/students">
      <JoinForm token={token} />
    </PageShell>
  );
}
