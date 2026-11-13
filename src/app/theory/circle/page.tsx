import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import { CircleOfFifthsPage } from "@/components/theory/CircleOfFifths";
import { CIRCLE_TOUR } from "@/features/guide/tours/circle";

export const metadata: Metadata = {
  title: "Interactive Circle of Fifths: Keys, Modes & Chords · attunr",
  description: "Interactive circle of fifths wheel: explore key signatures, relative major and minor keys, diatonic chords, and harmonic progressions in every key.",
  alternates: { canonical: "/theory/circle" },
};

export default function CirclePage() {
  return (
    <PageShell
      active="/theory/circle"
      wide
      pageId="circle"
      tour={CIRCLE_TOUR}
      title="Circle of fifths"
      intro="The twelve keys a fifth apart. Pick a major or a minor to see its key signature, its seven chords lit on the circle, and the keys next to it. Click any chord to hear it."
    >
      <CircleOfFifthsPage lead={<Lesson course="10/circle-map" why="The circle shows which keys are neighbours and which chords belong to a key, so you can guess a song's chords and change key smoothly." tryThis="Pick G major and find its I, IV and V on the circle. They sit side by side, which is why they sound so good together." />} />
    </PageShell>
  );
}
