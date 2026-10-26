import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Lesson from "@/components/theory/Lesson";
import TheoryPiano from "@/components/theory/piano/TheoryPiano";
import LabelSystemsArticle from "@/components/theory/LabelSystemsArticle";

export const metadata: Metadata = {
  title: "Piano · attunr",
  description: "Play the piano and see every note on a grand staff in your key: its name, its scale degree, the interval from the last note and the chord you are holding.",
};

export default function PianoPage() {
  return (
    <PageShell
      active="/theory/piano"
      title="Piano"
      intro="Pick a key and play: the staff writes each note in that key with its scale degree, joins it to the last few with the interval between them, and names the chord when notes sound together. Use the computer keys, click the keys, or connect a MIDI keyboard."
    >
      <Lesson stage={2} why="Seeing a note's degree and the interval to the next one while you play is how a key stops being a list of notes and starts being a set of sounds you can name." tryThis="In C major play C, then E, then G one at a time and watch the intervals: a major 3rd, then a minor 3rd. Now press all three at once and the staff calls it C, the I chord." />
      <TheoryPiano />
      <LabelSystemsArticle />
    </PageShell>
  );
}
