import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import IntervalSingerApp from "@/components/theory/singing/IntervalSingerApp";

export const metadata: Metadata = {
  title: "Sing an interval · attunr",
  description: "See an interval by name, hear Do, then sing the other note. The mic checks it and plays it back.",
};

export default function SingIntervalPage() {
  return (
    <PageShell
      active="/theory/singing/intervals"
      full
      devices
      title="Sing an interval"
      intro="An interval shows by name, like P5 or M3. Do plays. Sing the other note and hold it: when the mic hears it, it shows and plays back. Pick the intervals, the direction and your voice above the tool."
    >
      <IntervalSingerApp
        lead={<Lesson course="6/every-interval" why="Singing an interval from its name ties the name to the sound, so you can hear it in a song and find it on the neck." tryThis="Start with P5 and the octave only. Add M3 once you hit both without the dot, then turn Show my voice off." />}
      />
    </PageShell>
  );
}
