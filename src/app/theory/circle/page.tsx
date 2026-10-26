import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import { CircleOfFifthsPage } from "@/components/theory/CircleOfFifths";

export const metadata: Metadata = {
  title: "Circle of fifths · attunr",
  description: "Every major and minor key on the circle of fifths: key signatures, the chords of each key, relatives and neighbours.",
};

export default function CirclePage() {
  return (
    <PageShell
      active="/theory/circle"
      title="Circle of fifths"
      intro="The twelve keys a fifth apart. Pick a major or a minor to see its key signature, its seven chords lit on the circle, and the keys next to it. Click any chord to hear it."
    >
      <Lesson stage={3} why="The circle shows which keys are neighbours and which chords belong to a key, so you can guess a song's chords and change key smoothly." tryThis="Pick G major and find its I, IV and V on the circle. They sit side by side, which is why they sound so good together." />
      <CircleOfFifthsPage />
    </PageShell>
  );
}
