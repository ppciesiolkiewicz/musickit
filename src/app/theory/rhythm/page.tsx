import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { RhythmGame } from "@/features/rhythm";

export const metadata: Metadata = {
  title: "Rhythm game · Music Kit",
  description: "Play in time: hit each note on the beat with Space or a tap, or strum your guitar into the microphone, and see how early or late you are.",
};

export default function RhythmPage() {
  return (
    <PageShell active="/theory/rhythm" title="Rhythm" intro="Pick a rhythm and a tempo, press Start, and after a bar of count-in hit each note as it reaches the line: with Space, a tap, or by strumming your guitar into the microphone.">
      <RhythmGame />
    </PageShell>
  );
}
