import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import TriadsExplorer from "@/components/chordKit/TriadsExplorer";

export const metadata: Metadata = {
  title: "Triads by string group · Music Kit",
  description: "Closed-position triads and their inversions on every group of three adjacent strings.",
};

export default function TriadsPage() {
  return (
    <PageShell
      active="/theory/triads"
      title="Triads by string group"
      intro="Pick a root and a triad type, then see every closed voicing and inversion on each set of three neighbouring strings. Tap a shape to hear it."
    >
      <Lesson stage={3} why="Triads are three-note chords on neighbouring strings: small, clear and playable anywhere on the neck, ideal for a second guitar or a busy band." tryThis="Find a G major triad on the top three strings in all three inversions, then play them in a row up the neck." />
      <TriadsExplorer />
    </PageShell>
  );
}
