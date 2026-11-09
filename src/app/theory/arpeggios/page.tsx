import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ArpeggiosExplorer from "@/components/chordKit/ArpeggiosExplorer";
import { ARPEGGIOS_TOUR } from "@/features/guide/tours/arpeggios";

export const metadata: Metadata = {
  title: "Guitar Arpeggios Explorer: Neck Shapes & Scale Degrees · attunr",
  description: "Visualize guitar arpeggio shapes overlaid on scales and modes across the entire neck. Master major, minor, 7th, and extended arpeggios in any key.",
  alternates: { canonical: "/theory/arpeggios" },
};

export default function ArpeggiosPage() {
  return (
    <PageShell
      active="/theory/arpeggios"
      full
      devices
      pageId="arpeggios"
      tour={ARPEGGIOS_TOUR}
      title="Arpeggios over scales"
      intro="Pick any key and any of the 21 modes or exotic scales, choose an arpeggio (the scale's own chord or any other type), and see it on the whole neck with the scale behind it."
    >
      <Lesson course="5/arpeggios" why="An arpeggio is a chord played one note at a time. Aiming for chord tones is what makes a solo sound like it follows the changes." tryThis="Play the A minor arpeggio in one box, then improvise over Am and land on a chord tone at the end of each phrase." />
      <ArpeggiosExplorer side guide />
    </PageShell>
  );
}
