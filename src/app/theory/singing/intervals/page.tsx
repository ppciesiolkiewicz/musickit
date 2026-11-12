import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AlsoTry from "@/components/theory/AlsoTry";
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
      related={<AlsoTry current="/theory/singing/intervals" />}
      devices mic
      title="Sing an interval"
      intro="Sing the gap between two notes. An interval has a name, like P5 or M3. Do plays; sing the other note and hold it, and when the mic hears it, it shows and plays back. Start with small intervals, then add bigger ones in the settings."
    >
      <IntervalSingerApp
        lead={<Lesson course="6/every-interval" why="Singing an interval from its name ties the name to the sound, so you can hear it in a song and find it on the neck." tryThis="Start on level 1, P5 and the octave. Move up a level once both feel easy, and turn Show my voice off when you want it harder." />}
      />
    </PageShell>
  );
}
