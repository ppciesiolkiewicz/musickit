import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import CagedExplorer from "@/components/chordKit/CagedExplorer";
import NeighboursView from "@/components/chordKit/NeighboursView";

export const metadata: Metadata = {
  title: "CAGED system · attunr",
  description: "The five CAGED chord shapes in major and minor, with the arpeggio, scale and pentatonic inside each box.",
};

export default function CagedPage() {
  return (
    <PageShell
      active="/theory/caged"
      full
      title="CAGED system"
      intro="Five chord shapes (C, A, G, E, D) link up across the neck. Pick a key and major or minor to see each shape and, in three separate boxes, its arpeggio, scale and pentatonic."
    >
      <Lesson course="8/d-c-a-shapes" why="CAGED links five shapes of one chord across the neck, so you can play any chord, scale or arpeggio in any position without jumping." tryThis="Pick C major and play the five shapes one after another up the neck. Then scroll to shape neighbours and play I–IV–V–I in one region." />
      <CagedExplorer side>
        <NeighboursView />
      </CagedExplorer>
    </PageShell>
  );
}
