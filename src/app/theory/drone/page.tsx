import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import { Jam } from "@/features/instruments";
import WireNam from "@/components/WireNam";

export const metadata: Metadata = {
  title: "Drone · attunr",
  description: "A held note to play scales, modes and arpeggios against, with a drum machine and a bass in the same key and tempo.",
};

export default function DronePage() {
  return (
    <PageShell
      active="/theory/drone"
      title="Drone"
      intro="Hold one note and play a scale, a mode or an arpeggio against it: every mode sounds different over its own root. Add drums and a bass in the drone's key; each starts on the next beat."
    >
      <Lesson stage={4} why="A drone fixes the root so you can hear how every other note relates to it; it is the quickest way to feel the colour of a mode." tryThis="Start the drone on D and play D Dorian slowly. Stop on the 6th (B) and listen to how it brightens the minor sound." />
      <WireNam />
      <Jam />
    </PageShell>
  );
}
