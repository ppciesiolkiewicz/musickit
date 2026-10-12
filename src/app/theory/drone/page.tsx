import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
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
      <DroneWidget />
    </PageShell>
  );
}
