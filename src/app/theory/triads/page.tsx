import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TriadsExplorer from "@/components/chordKit/TriadsExplorer";

export const metadata: Metadata = {
  title: "Triads by string group · Music Kit",
  description: "Closed-position triads and their inversions on every group of three adjacent strings.",
};

export default function TriadsPage() {
  return (
    <PageShell labels
      active="/theory/triads"
      title="Triads by string group"
      intro="Pick a root and a triad type, then see every closed voicing and inversion on each set of three neighbouring strings. Tap a shape to hear it."
    >
      <TriadsExplorer />
    </PageShell>
  );
}
