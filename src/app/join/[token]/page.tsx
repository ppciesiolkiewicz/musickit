import type { Metadata } from "next";
import { alt as ogAlt, size as ogSize } from "@/app/opengraph-image";
import PageShell from "@/components/PageShell";
import { googleConfig } from "@/features/account/server/google";
import JoinForm, { JoinTitle } from "@/features/account/ui/JoinForm";

// the link preview (WhatsApp, Slack...) says it's an invite. Setting openGraph here replaces the layout's whole openGraph and
// drops the site picture (src/app/opengraph-image.tsx), so siteName, type and the picture are given again.
const PREVIEW = {
  title: "You've been invited",
  description: "A free attunr account is waiting for you. Open the link to join.",
  images: [{ url: "/opengraph-image", width: ogSize.width, height: ogSize.height, alt: ogAlt }],
};

export const metadata: Metadata = {
  title: "Invite · attunr",
  robots: { index: false },
  openGraph: { type: "website", siteName: "attunr", locale: "en_US", ...PREVIEW },
  twitter: { card: "summary_large_image", ...PREVIEW },
};

/**
 * A teacher or personal invite we sent (made on /admin/invites). Public: a visitor who isn't logged in sees the invite and logs in here
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
