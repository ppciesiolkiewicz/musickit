import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import IntroVideos from "@/features/intro/IntroVideos";

export const metadata: Metadata = {
  title: "Quick tour · attunr",
  description: "Two short tours of attunr: a daily practice plan for a person who practises on their own, and weekly plans and lesson notes for teachers and schools.",
  alternates: { canonical: "/intro" },
};

export default function IntroPage() {
  return (
    <PageShell title="Quick tour" intro="What attunr does, in two short tours. Pick the one that fits you." active="/intro" column>
      <IntroVideos />
    </PageShell>
  );
}
