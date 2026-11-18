import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Welcome from "@/features/students/ui/Welcome";

export const metadata: Metadata = { title: "Welcome · attunr", robots: { index: false } };

/** Where a teacher's student lands after their claim link. Not public: logged out, the proxy sends them to log in. */
export default function WelcomePage() {
  return (
    <PageShell centered title="Welcome to attunr" active="/plan">
      <Welcome />
    </PageShell>
  );
}
