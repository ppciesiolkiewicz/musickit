import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import BreathingApp from "@/components/theory/singing/BreathingApp";

export const metadata: Metadata = {
  title: "Farinelli Breathing for Singers: Guided Breath Exercise · attunr",
  description: "Farinelli breathing for singers: breathe in, hold and breathe out for the same count, one count longer each cycle. A circle paces each breath, no mic needed.",
  alternates: { canonical: "/theory/singing/breathing" },
};

export default function BreathingPage() {
  return (
    <PageShell
      active="/theory/singing/breathing"
      title="Farinelli breathing"
      intro="Breathe in, hold and breathe out for the same count. Each cycle adds one count, so each breath lasts a little longer. No mic is needed: the circle grows as you breathe in and shrinks as you breathe out."
    >
      <BreathingApp
        lead={<Lesson course="3/breath-and-holding-a-note" why="A long, even breath out is what holds a note steady to its end. This drill trains it without your voice, so all you notice is the air." tryThis="Start on Beginner and keep your shoulders still. Move up a level once the last cycle feels as easy as the first." />}
      />
    </PageShell>
  );
}
