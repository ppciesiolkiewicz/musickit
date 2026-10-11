import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Tuner from "@/features/tuner/Tuner";

export const metadata: Metadata = {
  title: "Tuner · Music Kit",
  description: "A tuner for guitar (with alternate tunings), bass, ukulele, violin, viola, cello, mandolin, banjo or any note, with a choice of A4 reference pitch.",
};

export default function TunerPage() {
  return (
    <PageShell active="/tuner" title="Tuner" intro="Pick an instrument and tuning (or Chromatic for any note) and the A4 reference. Press start, allow the microphone and play one string. Tap a string below to hear its pitch.">
      <Tuner />
    </PageShell>
  );
}
