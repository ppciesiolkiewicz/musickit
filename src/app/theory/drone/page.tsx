import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import DroneWidget from "@/components/DroneWidget";

export const metadata: Metadata = {
  title: "Drone · Music Kit",
  description: "A held note to play scales, modes and arpeggios against, with a few settings for the sound.",
};

export default function DronePage() {
  return (
    <PageShell
      active="/theory/drone"
      title="Drone"
      intro="Hold one note and play a scale, a mode or an arpeggio against it: every mode sounds different over its own root. Pick the note and the sound."
    >
      <Lesson stage={4} why="A drone fixes the root so you can hear how every other note relates to it; it is the quickest way to feel the colour of a mode." tryThis="Start the drone on D and play D Dorian slowly. Stop on the 6th (B) and listen to how it brightens the minor sound." />
      <DroneWidget />
    </PageShell>
  );
}
