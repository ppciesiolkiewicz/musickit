import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TuneByEar from "@/components/theory/TuneByEar";

export const metadata: Metadata = {
  title: "Tune by ear · attunr",
  description: "Learn to tune a guitar without a tuner: sing the open strings E A D G B E, neighbouring pairs and the 5th-fret unisons in your voice's range, then hear whether a string is flat, sharp or in tune against the 5th-fret reference.",
};

export default function TuneByEarPage() {
  return (
    <PageShell
      active="/theory/tune-by-ear"
      devices
      title="Tune by ear"
      intro="Sing the guitar's open strings until you carry their pitches, then train your ear on the reference and the next string: flat, sharp or in tune, one after the other or ringing together to hear the beats."
    >
      <TuneByEar />
    </PageShell>
  );
}
