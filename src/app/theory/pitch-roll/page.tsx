import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PitchRoll from "@/components/theory/pitchRoll/PitchRoll";

export const metadata: Metadata = {
  title: "Pitch Detector on a Piano Roll · attunr",
  description: "Sing or play into the mic and watch your pitch as a line on a piano roll of every key, with the notes of your key tinted.",
  alternates: { canonical: "/theory/pitch-roll" },
};

export default function PitchRollPage() {
  return (
    <PageShell
      active="/theory/pitch-roll"
      full
      mic
      title="Pitch roll"
      intro="Sing or play a note and watch your pitch as a line on the piano roll. Press Start microphone below to begin. The notes of the key and scale you pick are tinted yellow, so you can see when you leave the scale. Tap a key on the left to hear it."
    >
      <PitchRoll />
    </PageShell>
  );
}
