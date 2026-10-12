import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TheoryHub from "@/components/theory/TheoryHub";

export const metadata: Metadata = {
  title: "Theory · Music Kit",
  description: "A loose guitar course in four stages and three tracks, plus explorers for chords, scales, CAGED and the circle of fifths, and practice games.",
};

export default function TheoryPage() {
  return (
    <PageShell active="/theory" title="Theory">
      <TheoryHub />
    </PageShell>
  );
}
