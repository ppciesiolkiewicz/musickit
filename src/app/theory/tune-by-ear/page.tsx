import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TuneByEar from "@/components/theory/TuneByEar";
import { TUNE_BY_EAR_TOUR } from "@/features/guide/tours/tune-by-ear";

export const metadata: Metadata = {
  title: "Tune by ear · attunr",
  description: "Learn to tune a guitar without a tuner: sing the open strings E A D G B E, neighbouring pairs and the 5th-fret unisons in your voice's range, then hear whether a string is flat, sharp or in tune against the 5th-fret reference.",
};

export default function TuneByEarPage() {
  return (
    <PageShell
      active="/theory/tune-by-ear"
      full
      devices mic
      pageId="tune-by-ear"
      tour={TUNE_BY_EAR_TOUR}
      title="Tune by ear"
      intro="Learn the sound of the open strings, then test your ear. Sing each open string until you carry its pitch, then hear the next string and decide if it is flat, sharp or in tune. Let two strings ring together to hear the beats."
    >
      <TuneByEar />
    </PageShell>
  );
}
