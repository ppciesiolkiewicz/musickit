import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import FeedbackPage from "@/features/messages/ui/FeedbackPage";

export const metadata: Metadata = { title: "Send feedback · attunr", robots: { index: false } };

export default function Feedback() {
  return (
    <PageShell title="Send feedback" active="/account">
      <FeedbackPage />
    </PageShell>
  );
}
