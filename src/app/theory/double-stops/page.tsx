import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import DoubleStopsExplorer from "@/components/chordKit/DoubleStopsExplorer";
import { DOUBLE_STOPS_TOUR } from "@/features/guide/tours/double-stops";

export const metadata: Metadata = {
  title: "Guitar Double Stops: 3rds, 6ths and 4ths in Every Key · attunr",
  description: "Harmonize any scale in 3rds, 6ths or 4ths on the guitar. See every double stop up the neck on each pair of strings, and hear it.",
  alternates: { canonical: "/theory/double-stops" },
};

export default function DoubleStopsPage() {
  return (
    <PageShell
      active="/theory/double-stops"
      pageId="double-stops"
      tour={DOUBLE_STOPS_TOUR}
      full
      devices
      title="Double stops"
      intro="Two notes of the scale played together on two strings. Pick a key, then 3rds, 6ths or 4ths, and follow the double stops up the neck. Tap one to hear it."
    >
      <Lesson course="5/fifths" why="Two notes at once sound fuller than one and lighter than a chord, so they sit between a solo and the rhythm part. A scale in 3rds or 6ths gives you fills that always fit the key." tryThis="Play the 3rds on the B and high e strings up the scale, one pair per beat. Then slide from each pair into the next." />
      <DoubleStopsExplorer />
    </PageShell>
  );
}
