import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import ArpeggiosExplorer from "@/components/chordKit/ArpeggiosExplorer";

export const metadata: Metadata = {
  title: "Arpeggios · Music Kit",
  description: "Arpeggios of any chord overlaid on any scale or mode, across the whole guitar neck.",
};

export default function ArpeggiosPage() {
  return (
    <PageShell
      active="/theory/arpeggios"
      title="Arpeggios over scales"
      intro="Pick any key and any of the 21 modes or exotic scales, choose an arpeggio (the scale's own chord or any other type), and see it on the whole neck with the scale behind it."
    >
      <Lesson stage={4} why="An arpeggio is a chord played one note at a time. Aiming for chord tones is what makes a solo sound like it follows the changes." tryThis="Play the A minor arpeggio in one box, then improvise over Am and land on a chord tone at the end of each phrase." />
      <ArpeggiosExplorer />
    </PageShell>
  );
}
