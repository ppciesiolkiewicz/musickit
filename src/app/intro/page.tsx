import type { Metadata } from "next";
import { shareMeta } from "@/app/_og/share";
import PageShell from "@/components/PageShell";
import IntroVideos from "@/features/intro/IntroVideos";

const DESCRIPTION = "Two short tours of attunr: a daily practice plan for a person who practices on their own, and weekly plans and lesson notes for teachers and schools.";

export const metadata: Metadata = {
  title: "Quick tour · attunr",
  description: DESCRIPTION,
  alternates: { canonical: "/intro" },
  ...shareMeta({ path: "/intro", title: "Quick tour of attunr", description: DESCRIPTION, sitePicture: true }),
};

export default function IntroPage() {
  return (
    <PageShell title="Quick tour" intro="What attunr does, in two short tours. Pick the one that fits you." active="/intro" column>
      <IntroVideos />
    </PageShell>
  );
}
