import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import SingingApp from "@/components/theory/singing/SingingApp";

export const metadata: Metadata = {
  title: "Singing · Music Kit",
  description: "Sing a scale, or a short random melody that ends on Do, and watch your voice as a dot on the staff, moving over the notes as you sing. Tap a note to hear it, play the scale or the melody on the beat, with a drone and a metronome to sing against.",
};

export default function SingingPage() {
  return (
    <PageShell
      active="/theory/singing"
      devices
      title="Singing"
      intro="Pick a key, a scale and your voice type (or any range), tap a note to hear it or play the scale up and down on the beat, then switch the mic on and sing: a dot follows your voice over the scale on the staff, up and down with the pitch and along from one note to the next. The Melodies tab writes short tunes in the key to sing back, two bars or four, easy to hard, each ending on a whole-note Do."
    >
      <Lesson stage={2} why="Singing a scale is the fastest way to hear it: once your voice can find each degree, your fingers have a sound to aim for." tryThis="Play the scale once and listen, then play it again and sing along with the mic on. The rest at the top is your breath before the way down." />
      <SingingApp />
    </PageShell>
  );
}
