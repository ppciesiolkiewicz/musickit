import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import TriadsExplorer from "@/components/chordKit/TriadsExplorer";
import { TRIADS_TOUR } from "@/features/guide/tours/triads";

export const metadata: Metadata = {
  title: "Guitar Triads on String Sets: Inversions & Shapes · attunr",
  description: "Master closed-position guitar triads and inversions across every adjacent three-string group. Visualize root, 1st, and 2nd inversions on the fretboard.",
  alternates: { canonical: "/theory/triads" },
};

export default function TriadsPage() {
  return (
    <PageShell
      active="/theory/triads"
      pageId="triads"
      tour={TRIADS_TOUR}
      full
      devices
      title="Triads by string group"
      intro="Pick a root and a triad type, then see every closed voicing and inversion on each set of three neighbouring strings. Tap a shape to hear it."
    >
      <Lesson course="5/triads" why="Triads are three-note chords on neighbouring strings: small, clear and playable anywhere on the neck, ideal for a second guitar or a busy band." tryThis="Find a G major triad on the top three strings in all three inversions, then play them in a row up the neck." />
      <TriadsExplorer side />
    </PageShell>
  );
}
