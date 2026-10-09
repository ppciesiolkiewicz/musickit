import type { Metadata } from "next";
import PageShell from "@/components/chordKit/PageShell";
import CagedExplorer from "@/components/chordKit/CagedExplorer";

export const metadata: Metadata = {
  title: "CAGED system · Music Kit",
  description: "The five CAGED chord shapes in major and minor, with the arpeggio, scale and pentatonic inside each box.",
};

export default function CagedPage() {
  return (
    <PageShell
      active="/caged"
      title="CAGED system"
      intro="Five chord shapes (C, A, G, E, D) link up across the neck. Pick a key and major or minor to see each shape and, in three separate boxes, its arpeggio, scale and pentatonic."
    >
      <CagedExplorer />
    </PageShell>
  );
}
