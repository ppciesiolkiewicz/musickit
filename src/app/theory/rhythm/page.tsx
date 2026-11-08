import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { RhythmGame } from "@/features/rhythm";
import { RHYTHM_TOUR } from "@/features/guide/tours/rhythm";

export const metadata: Metadata = {
  title: "Rhythm game · attunr",
  description: "Play in time: hit each note on the beat with Space or a tap, or strum your guitar into the microphone, and see how early or late you are.",
};

export default function RhythmPage() {
  return (
    <PageShell active="/theory/rhythm" devices pageId="rhythm" tour={RHYTHM_TOUR} title="Rhythm" intro="Pick a rhythm and a tempo, press Start, and after a bar of count-in hit each note as it reaches the line: with Space, a tap, or by strumming your guitar into the microphone.">
      <RhythmGame />
    </PageShell>
  );
}
