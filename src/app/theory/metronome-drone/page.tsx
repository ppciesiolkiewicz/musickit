import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import { Jam } from "@/features/instruments";
import WireNam from "@/components/WireNam";
import { METRONOME_DRONE_TOUR } from "@/features/guide/tours/metronome-drone";

export const metadata: Metadata = {
  title: "Metronome & drone · attunr",
  description: "An online metronome with a drone: keep time with a click, hold a note to play scales, modes and arpeggios against, and add a drum machine and a bass in the same key and tempo.",
};

export default function MetronomeDronePage() {
  return (
    <PageShell
      active="/theory/metronome-drone"
      pageId="metronome-drone"
      tour={METRONOME_DRONE_TOUR}
      title="Metronome & drone"
      intro="Practise to a click or a held note. Play a scale to the click, or hold one note and play a scale, a mode or an arpeggio against it: every mode sounds different over its own root. Add drums and a bass in the drone's key if you want a band."
    >
      <Lesson course="9/modes-over-drone" why="A drone fixes the root so you can hear how every other note relates to it; it is the quickest way to feel the colour of a mode." tryThis="Start the drone on D and play D Dorian slowly. Stop on the 6th (B) and listen to how it brightens the minor sound." />
      <WireNam />
      <Jam />
    </PageShell>
  );
}
