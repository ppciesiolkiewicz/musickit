import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Tuner from "@/features/tuner/Tuner";

export const metadata: Metadata = {
  title: "Tuner · Music Kit",
  description: "A tuner for guitar (with alternate tunings), bass, ukulele, violin or any note, with a choice of input and A4 reference pitch.",
};

export default function TunerPage() {
  return (
    <PageShell active="/tuner" title="Tuner" intro="Pick an instrument and tuning (or Chromatic for any note) and the input. Press start and play one string. Tap a string below to hear its pitch.">
      <Tuner />
    </PageShell>
  );
}
