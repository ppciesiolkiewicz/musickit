import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CircleOfFifthsPage } from "@/components/theory/CircleOfFifths";

export const metadata: Metadata = {
  title: "Circle of fifths · Music Kit",
  description: "Every major and minor key on the circle of fifths: key signatures, the chords of each key, relatives and neighbours.",
};

export default function CirclePage() {
  return (
    <PageShell
      active="/theory/circle"
      title="Circle of fifths"
      intro="The twelve keys a fifth apart. Pick a major or a minor to see its key signature, its seven chords lit on the circle, and the keys next to it. Click any chord to hear it."
    >
      <CircleOfFifthsPage />
    </PageShell>
  );
}
