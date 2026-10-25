import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import SingingApp from "@/components/theory/singing/SingingApp";

export const metadata: Metadata = {
  title: "Singing · Music Kit",
  description: "Sing a scale and watch your voice as a dot on the staff, moving over the notes as you sing, with a drone and a metronome to sing against.",
};

export default function SingingPage() {
  return (
    <PageShell
      active="/theory/singing"
      title="Singing"
      intro="Pick a key, a scale and your voice range, switch the mic on and sing: a dot follows your voice over two octaves of the scale on the staff, up and down with the pitch and along from one note to the next."
    >
      <Lesson stage={2} why="Singing a scale is the fastest way to hear it: once your voice can find each degree, your fingers have a sound to aim for." tryThis="Start the drone on the root, sing the root until the dot sits still on it, then walk up one note at a time and back down." />
      <SingingApp />
    </PageShell>
  );
}
